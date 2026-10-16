import { z } from "zod";
import type { Appointment, AppointmentStatus } from "../mock-data";
import { mapAppointment, mapCalendar, mapSnapshot, type Settings } from "./mapping";
import { getSupabaseClient } from "./client";
import { appointmentMutation } from "../integrations/appointment-mutation.functions";

export interface RpcTransport {
  appointmentSnapshots?: () => Promise<Map<string, unknown>>;
  rpc(
    name: string,
    input?: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
}
export type NewAppointment = Omit<Appointment, "id" | "token" | "createdAt" | "history">;
export const tokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Management link is invalid or expired.");
const publicBooking = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  phone: z.string().regex(/^[+\d][\d ().-]{6,30}$/),
  company: z.string().max(200),
  meeting_type: z.enum(["client", "technical", "recruitment", "partnership", "internal"]),
  starts_at: z.string().datetime(),
  notes: z.string().max(5000),
});
export function bookingInput(a: NewAppointment) {
  const guest = a.guest;
  const parts = guest?.name.trim().split(/\s+/) ?? [];
  return publicBooking.parse({
    first_name: guest?.firstName ?? parts[0] ?? "",
    last_name: guest?.lastName ?? parts.slice(1).join(" "),
    email: guest?.email,
    phone: guest?.phone,
    company: guest?.company ?? "",
    starts_at: a.start.toISOString(),
    meeting_type: a.type,
    notes: a.notes,
  });
}
export function repositoryError(error: { code?: string; message: string }) {
  if (error.code === "23P01" || /slot|overlap/i.test(error.message))
    return new Error("This time slot is no longer available.");
  if (
    /PGRST20[25]|42P01/.test(error.code ?? "") ||
    /schema cache|does not exist/.test(error.message)
  )
    return new Error(
      "Supabase setup is incomplete. Apply supabase/migrations/202610160001_core.sql in the SQL Editor.",
    );
  if (error.code === "42501")
    return new Error(
      /Management/.test(error.message)
        ? "Management link is invalid or expired."
        : "Administrator access required. Sign in with the owner account linked in setup-owner.sql.",
    );
  return new Error(error.message);
}
export interface AppointmentsRepository {
  list(): ReturnType<SupabaseRepository["list"]>;
  create(
    a: NewAppointment,
    origin: "public" | "admin",
  ): Promise<{ appointment: Appointment; token: string }>;
  managed(token: string): Promise<Appointment | null>;
  change(
    id: string,
    action: string,
    input?: Record<string, unknown>,
    token?: string,
  ): Promise<Appointment>;
}
export interface ContactsRepository {
  contacts(): Promise<ReturnType<typeof mapSnapshot>["contacts"]>;
}
export interface AvailabilityRepository {
  calendar(
    duration?: number,
    token?: string,
    excludeId?: string,
  ): Promise<ReturnType<typeof mapCalendar>>;
}
export interface SettingsRepository {
  saveSettings(settings: Settings): Promise<ReturnType<typeof mapSnapshot>>;
}
export class SupabaseRepository
  implements ContactsRepository, AvailabilityRepository, SettingsRepository
{
  constructor(private transport: RpcTransport) {}
  private async call(name: string, input?: Record<string, unknown>) {
    const { data, error } = await this.transport.rpc(name, input);
    if (error) throw repositoryError(error);
    return data;
  }
  async list() {
    const snapshot = await this.call("admin_snapshot");
    // admin_snapshot projects the canonical contact; fetch the existing owner-only
    // snapshots by appointment ID so reused emails cannot replace booking details.
    return mapSnapshot(snapshot, await this.transport.appointmentSnapshots?.());
  }
  async contacts() {
    return (await this.list()).contacts;
  }
  async calendar(duration?: number, token?: string, excludeId?: string) {
    return mapCalendar(
      await this.call("booking_calendar", {
        p_duration: duration ?? null,
        p_token: token ?? null,
        p_exclude_id: token ? null : (excludeId ?? null),
      }),
    );
  }
  async create(a: NewAppointment, origin: "public" | "admin") {
    const input =
      origin === "public"
        ? bookingInput(a)
        : {
            contact_id: z.string().uuid().parse(a.contactId),
            starts_at: a.start.toISOString(),
            duration_minutes: a.duration,
            meeting_type: a.type,
            status: a.status,
            notes: a.notes,
          };
    const result = z.object({ appointment: z.unknown(), management_token: tokenSchema }).parse(
      await this.call(origin === "public" ? "create_booking" : "admin_create_appointment", {
        p_input: input,
      }),
    );
    return {
      appointment: mapAppointment(result.appointment, result.management_token),
      token: result.management_token,
    };
  }
  async managed(token: string) {
    tokenSchema.parse(token);
    const raw = await this.call("get_managed_appointment", { p_token: token });
    return raw == null ? null : mapAppointment(raw, token);
  }
  async change(id: string, action: string, input: Record<string, unknown> = {}, token?: string) {
    const raw = token
      ? await this.call("manage_appointment", {
          p_token: tokenSchema.parse(token),
          p_action: action,
          p_input: input,
        })
      : await this.call("admin_change_appointment", { p_id: id, p_action: action, p_input: input });
    return mapAppointment(raw, token);
  }
  async issueToken(id: string) {
    return tokenSchema.parse(await this.call("admin_issue_management_token", { p_id: id }));
  }
  async saveSettings(settings: Settings) {
    return mapSnapshot(await this.call("admin_save_settings", { p_input: settings }));
  }
}
let repository: SupabaseRepository | undefined;
export function getRepository() {
  if (!repository)
    repository = new SupabaseRepository({
      appointmentSnapshots: async () => {
        const { data, error } = await getSupabaseClient()
          .from("appointments")
          .select("id,guest_details");
        if (error) throw repositoryError(error);
        return new Map((data ?? []).map((a) => [a.id as string, a.guest_details as unknown]));
      },
      rpc: async (name, input) => {
        if (
          name === "create_booking" ||
          name === "admin_create_appointment" ||
          ((name === "manage_appointment" || name === "admin_change_appointment") &&
            (input?.["p_action"] === "reschedule" || input?.["p_action"] === "cancel"))
        ) {
          const { data } = await getSupabaseClient().auth.getSession();
          const result = await appointmentMutation({
            data: {
              name,
              input: input ?? {},
              ...(data.session ? { accessToken: data.session.access_token } : {}),
            },
          });
          return { data: JSON.parse(result.data) as unknown, error: result.error };
        }
        return await getSupabaseClient().rpc(name, input);
      },
    });
  return repository;
}
