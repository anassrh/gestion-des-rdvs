import { addMinutes, isValid } from "date-fns";
import { contacts, MEETING_TYPES, type Appointment, type AppointmentStatus } from "./mock-data";

export function assertMeeting(
  start: Date,
  duration: number,
  appointments: Appointment[],
  buffer: number,
  excludeId?: string,
) {
  if (!isValid(start) || !Number.isInteger(duration) || duration < 15 || duration > 120)
    throw new Error("Choose a valid date and a duration between 15 and 120 minutes.");
  if (
    appointments.some(
      (a) =>
        a.id !== excludeId &&
        a.status !== "cancelled" &&
        a.status !== "completed" &&
        start < addMinutes(a.start, a.duration + buffer) &&
        addMinutes(start, duration + buffer) > a.start,
    )
  )
    throw new Error("This time overlaps another appointment or its buffer. Choose another time.");
}
export function assertTransition(
  appointment: Appointment,
  status: AppointmentStatus,
  now = new Date(),
) {
  if (appointment.status === status) return;
  if (appointment.status === "cancelled" || appointment.status === "completed")
    throw new Error("This appointment is closed and cannot be changed.");
  if (status === "pending") throw new Error("Use Reschedule to return an appointment to pending.");
  if (
    status === "completed" &&
    (appointment.status !== "confirmed" ||
      addMinutes(appointment.start, appointment.duration) > now)
  )
    throw new Error("Only a confirmed meeting that has ended can be marked completed.");
}
export function reviveAppointments(raw: unknown): Appointment[] {
  if (!Array.isArray(raw)) throw new Error("Invalid appointments");
  return raw.map((a) => {
    if (
      !a ||
      typeof a.id !== "string" ||
      typeof a.token !== "string" ||
      !["pending", "confirmed", "cancelled", "completed"].includes(a.status) ||
      !MEETING_TYPES.some((m) => m.value === a.type) ||
      !Array.isArray(a.history) ||
      (!a.guest && !contacts.some((c) => c.id === a.contactId)) ||
      (a.guest && (!a.guest.name || !a.guest.email))
    )
      throw new Error("Invalid appointment");
    const start = new Date(a.start),
      createdAt = new Date(a.createdAt);
    if (
      !isValid(start) ||
      !isValid(createdAt) ||
      !Number.isFinite(a.duration) ||
      a.duration < 15 ||
      a.duration > 120
    )
      throw new Error("Invalid appointment date");
    return {
      ...a,
      start,
      createdAt,
      history: a.history.map((h: { at: string; label: string }) => {
        const at = new Date(h.at);
        if (!isValid(at) || typeof h.label !== "string") throw new Error("Invalid history");
        return { ...h, at };
      }),
    };
  });
}
