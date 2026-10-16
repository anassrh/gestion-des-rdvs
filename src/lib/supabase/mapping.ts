import { z } from "zod";
import type { Appointment, Contact } from "../mock-data";
import { defaultSettings } from "../preferences";

const contactRow = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company: z.string().nullish(),
  phone: z.string().nullish(),
  role_label: z.string().nullish(),
  notes: z.string().nullish(),
});
const appointmentRow = z.object({
  id: z.string(),
  contact_id: z.string(),
  starts_at: z.string().datetime({ offset: true }),
  duration_minutes: z.number().int().min(15).max(120),
  meeting_type: z.enum(["client", "technical", "recruitment", "partnership", "internal"]),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  notes: z.string().nullish(),
  created_at: z.string().datetime({ offset: true }),
  contact: contactRow,
  guest_details: contactRow.nullish(),
  events: z
    .array(
      z.object({
        event_type: z.string(),
        actor_type: z.string(),
        created_at: z.string().datetime({ offset: true }),
      }),
    )
    .default([]),
});
export function mapContact(raw: unknown): Contact {
  const c = contactRow.parse(raw);
  return {
    id: c.id,
    name: c.full_name,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    company: c.company ?? "",
    phone: c.phone ?? "",
    role: c.role_label ?? "",
    notes: c.notes ?? "",
  };
}
const eventLabels: Record<string, string> = {
  created: "Appointment created",
  confirmed: "Attendance confirmed",
  cancelled: "Appointment cancelled",
  completed: "Meeting completed",
  rescheduled: "Appointment rescheduled; awaiting confirmation",
  edited: "Appointment details edited",
};
export function mapAppointment(raw: unknown, token = ""): Appointment {
  const a = appointmentRow.parse(raw);
  return {
    id: a.id,
    token,
    contactId: a.contact_id,
    guest: mapContact(a.guest_details ?? a.contact),
    start: new Date(a.starts_at),
    duration: a.duration_minutes,
    type: a.meeting_type,
    status: a.status,
    notes: a.notes ?? "",
    createdAt: new Date(a.created_at),
    reminder: "none",
    history: a.events.map((e) => ({
      at: new Date(e.created_at),
      label: `${eventLabels[e.event_type] ?? e.event_type} (${e.actor_type})`,
    })),
  };
}
const configRow = z.object({
  profile: z.object({
    display_name: z.string(),
    role_label: z.string(),
    timezone: z.string(),
    email: z.string().optional(),
    notification_email: z.string().nullish(),
  }),
  preferences: z.object({
    duration_minutes: z.number(),
    buffer_minutes: z.number(),
    minimum_notice_hours: z.number(),
    booking_horizon_days: z.number(),
  }),
  rules: z.array(
    z.object({
      weekday: z.number(),
      enabled: z.boolean(),
      start_local_time: z.string(),
      end_local_time: z.string(),
    }),
  ),
});
export type Settings = typeof defaultSettings;
export function mapSettings(raw: unknown): Settings {
  const { profile: p, preferences: b, rules } = configRow.parse(raw);
  const first = rules.find((r) => r.enabled) ?? rules[0];
  return {
    ...defaultSettings,
    name: p.display_name,
    role: p.role_label,
    email: p.email ?? "",
    notificationEmail: p.notification_email ?? "",
    timezone: p.timezone,
    duration: b.duration_minutes,
    buffer: b.buffer_minutes,
    notice: b.minimum_notice_hours,
    horizon: b.booking_horizon_days,
    days: rules.filter((r) => r.enabled).map((r) => r.weekday),
    start: first?.start_local_time.slice(0, 5) ?? "09:00",
    end: first?.end_local_time.slice(0, 5) ?? "18:00",
  };
}
export function mapCalendar(raw: unknown) {
  const slots = z
    .object({ slots: z.array(z.string().datetime({ offset: true })) })
    .parse(raw).slots;
  return { settings: mapSettings(raw), slots: slots.map((s) => new Date(s)) };
}
export function mapSnapshot(raw: unknown, guestSnapshots: Map<string, unknown> = new Map()) {
  const s = z
    .object({ contacts: z.array(z.unknown()), appointments: z.array(z.unknown()) })
    .parse(raw);
  return {
    settings: mapSettings(raw),
    contacts: s.contacts.map(mapContact),
    appointments: s.appointments.map((raw) => {
      const a = z.object({ id: z.string() }).passthrough().parse(raw);
      return mapAppointment({
        ...a,
        ...(guestSnapshots.has(a.id) ? { guest_details: guestSnapshots.get(a.id) } : {}),
      });
    }),
  };
}
