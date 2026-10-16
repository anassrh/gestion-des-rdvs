import { formatDistanceToNow } from "date-fns";
import { appointmentContact } from "./contact-selectors";
import type { ActivityItem, Appointment } from "./mock-data";
export function appointmentActivity(appointments: Appointment[]): ActivityItem[] {
  return appointments
    .flatMap((a) =>
      a.history.map((h, index) => ({
        id: `${a.id}-${index}`,
        at: h.at,
        text: `${appointmentContact(a).name} — ${h.label}`,
        kind: (/reschedul/i.test(h.label)
          ? "reschedule"
          : /cancel/i.test(h.label)
            ? "cancel"
            : /reminder/i.test(h.label)
              ? "reminder"
              : /confirm|complet/i.test(h.label)
                ? "confirm"
                : "booking") as ActivityItem["kind"],
      })),
    )
    .filter((a) => a.at <= new Date())
    .sort((a, b) => +b.at - +a.at)
    .slice(0, 5)
    .map((a) => ({ ...a, ago: formatDistanceToNow(a.at, { addSuffix: true }) }));
}
