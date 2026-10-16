import { addMinutes } from "date-fns";
import { meetingLabel, type Appointment } from "./mock-data";
const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
export function calendarFile(a: Appointment) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RdvFlow//Local Demo//EN",
    "BEGIN:VEVENT",
    `UID:${a.id}@meridian.demo`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(a.start)}`,
    `DTEND:${stamp(addMinutes(a.start, a.duration))}`,
    `SUMMARY:${meetingLabel(a.type)} with your RdvFlow host`,
    `STATUS:${a.status === "cancelled" ? "CANCELLED" : a.status === "pending" ? "TENTATIVE" : "CONFIRMED"}`,
    "DESCRIPTION:Local demo appointment. No calendar service is connected.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export function downloadCalendar(a: Appointment) {
  const url = URL.createObjectURL(
    new Blob([calendarFile(a)], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "RdvFlow-meeting.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
