import { addDays, addHours, addMinutes } from "date-fns";
import type { Appointment } from "./mock-data";
import { defaultSettings } from "./preferences";

export function availableSlots(
  date: Date,
  appointments: Appointment[],
  settings = defaultSettings,
  now = new Date(),
) {
  if (!settings.days.includes(date.getDay())) return [];
  const [sh = 9, sm = 0] = settings.start.split(":").map(Number);
  const [eh = 18, em = 0] = settings.end.split(":").map(Number);
  const slots: string[] = [];
  const duration = Math.max(15, settings.duration);
  const end = eh * 60 + em;
  for (
    let minute = sh * 60 + sm;
    minute + duration <= end;
    minute += duration + Math.max(0, settings.buffer)
  ) {
    const start = new Date(date);
    start.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    if (start < addHours(now, settings.notice) || start > addDays(now, settings.horizon)) continue;
    if (
      appointments.some(
        (a) =>
          a.status !== "cancelled" &&
          a.status !== "completed" &&
          start < addMinutes(a.start, a.duration + settings.buffer) &&
          addMinutes(start, duration + settings.buffer) > a.start,
      )
    )
      continue;
    slots.push(
      `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
    );
  }
  return slots;
}
