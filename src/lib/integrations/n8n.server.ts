import { z } from "zod";
import { mapAppointment, type Settings } from "../supabase/mapping";
import type { Appointment } from "../mock-data";
import type { RpcTransport } from "../supabase/repository";
import { getNotificationRecipient } from "./notification-recipient.server";

export type AppointmentEventType =
  "APPOINTMENT_CREATED" | "APPOINTMENT_RESCHEDULED" | "APPOINTMENT_CANCELLED";

const configSchema = z.object({
  webhook: z.string().url(),
  adminEmail: z.string().email(),
  publicUrl: z.string().url(),
});
type NotificationConfig = z.infer<typeof configSchema>;

export function buildAppointmentPayload({
  eventType,
  appointment,
  owner,
  token,
  config,
}: {
  eventType: AppointmentEventType;
  appointment: Appointment;
  owner: Pick<Settings, "name" | "timezone">;
  token: string;
  config: NotificationConfig;
}) {
  const client = appointment.guest;
  if (!client?.firstName || !client.lastName || !/^[a-f0-9]{64}$/.test(token))
    throw new Error("Notification data is incomplete");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: owner.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(appointment.start);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  const base = config.publicUrl.replace(/\/+$/, "");
  return {
    event_id: crypto.randomUUID(),
    event_type: eventType,
    appointment_id: appointment.id,
    client: {
      first_name: client.firstName,
      last_name: client.lastName,
      email: client.email,
      phone: client.phone,
    },
    appointment: {
      date: `${part("year")}-${part("month")}-${part("day")}`,
      time: `${part("hour")}:${part("minute")}`,
      duration_minutes: appointment.duration,
      meeting_type: appointment.type,
      notes: appointment.notes,
    },
    admin: { name: owner.name, email: config.adminEmail },
    management_url: `${base}/manage/${token}`,
    admin_url: `${base}/admin/appointments`,
  };
}

export async function sendAppointmentEvent(
  input: Parameters<typeof buildAppointmentPayload>[0],
  fetcher: typeof fetch = fetch,
) {
  let eventId: string | undefined;
  try {
    const payload = buildAppointmentPayload(input);
    eventId = payload.event_id;
    const response = await fetcher(input.config.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) {
      console.warn("Appointment notification failed", {
        event_id: eventId,
        reason: "http",
        status: response.status,
      });
    }
    // Delivery never depends on the response body, and no client details are logged.
    await response.body?.cancel();
  } catch {
    console.warn("Appointment notification failed", {
      event_id: eventId,
      reason: "network_timeout_or_payload",
    });
  }
}

// Called only with the result of a successful, committed Supabase mutation.
export async function notifyCommittedAppointment({
  name,
  input,
  result,
  transport,
  env,
  fetcher,
}: {
  name: string;
  input: Record<string, unknown>;
  result: unknown;
  transport: RpcTransport;
  env: Record<string, string | undefined>;
  fetcher?: typeof fetch;
}) {
  const created = name === "create_booking" || name === "admin_create_appointment";
  const action = input["p_action"];
  const eventType = created
    ? "APPOINTMENT_CREATED"
    : action === "reschedule"
      ? "APPOINTMENT_RESCHEDULED"
      : action === "cancel"
        ? "APPOINTMENT_CANCELLED"
        : null;
  if (!eventType) return;
  try {
    const createdResult = created
      ? z.object({ appointment: z.unknown(), management_token: z.string() }).parse(result)
      : null;
    const rawAppointment = createdResult ? createdResult.appointment : result;
    const appointment = mapAppointment(rawAppointment);
    const ownerId = z.object({ owner_id: z.string().uuid() }).parse(rawAppointment).owner_id;
    const config = configSchema.parse({
      webhook: env["N8N_APPOINTMENT_WEBHOOK_URL"],
      adminEmail: await getNotificationRecipient(ownerId, env),
      publicUrl: env["APP_PUBLIC_URL"],
    });
    let token = createdResult?.management_token ?? input["p_token"];
    if (!token) {
      // Admin operations cannot recover a stored hash; issue an additional capability.
      const issued = await transport.rpc("admin_issue_management_token", { p_id: appointment.id });
      if (issued.error) throw new Error("Management URL unavailable");
      token = issued.data;
    }
    const calendar = await transport.rpc("booking_calendar");
    if (calendar.error) throw new Error("Owner profile unavailable");
    const owner = z
      .object({ profile: z.object({ display_name: z.string(), timezone: z.string() }) })
      .parse(calendar.data).profile;
    await sendAppointmentEvent(
      {
        eventType,
        appointment,
        token: z.string().parse(token),
        owner: { name: owner.display_name, timezone: owner.timezone },
        config,
      },
      fetcher,
    );
  } catch {
    console.warn("Appointment notification failed", {
      event_type: eventType,
      reason: "configuration_or_lookup",
    });
  }
}
