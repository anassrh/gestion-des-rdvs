import { addDays, format, isSameDay, isSameMonth, isSameWeek } from "date-fns";
import type { Appointment, KnowledgeDoc } from "./mock-data";
import { allContacts, appointmentContact, contactMeetings } from "./contact-selectors";
import { knowledgeExcerpt } from "./knowledge";
export function mockAnswer(
  text: string,
  appointments: Appointment[],
  docs: KnowledgeDoc[],
  now = new Date(),
) {
  const q = text.toLowerCase();
  if (/document|onboarding|policy|knowledge/.test(q)) {
    const source = docs.find(
      (d) =>
        d.indexed &&
        d.status === "ready" &&
        (/onboarding/.test(q)
          ? /onboarding/i.test(d.name)
          : /cancel|policy/.test(q)
            ? /cancellation/i.test(d.name)
            : q.includes(d.name.toLowerCase()) ||
              (/architecture/.test(q) && /architecture/i.test(d.name)) ||
              (/pricing/.test(q) && /pricing/i.test(d.name))),
    );
    return source
      ? {
          text: knowledgeExcerpt(source),
          source: "knowledge",
          sourceTitle: `${source.name} · sample excerpt`,
          sourceId: source.id,
        }
      : {
          text: "No matching indexed document is available. Check Knowledge for its processing status. I only use explicitly matched sample excerpts in this demo.",
        };
  }
  if (/tomorrow|pending|waiting|week|cancel/.test(q)) {
    const rows = appointments
      .filter((a) =>
        /tomorrow/.test(q)
          ? isSameDay(a.start, addDays(now, 1)) &&
            (a.status === "pending" || a.status === "confirmed")
          : /pending|waiting/.test(q)
            ? a.status === "pending"
            : /cancel/.test(q)
              ? a.status === "cancelled" && isSameMonth(a.start, now)
              : isSameWeek(a.start, now, { weekStartsOn: 1 }),
      )
      .sort((a, b) => +a.start - +b.start);
    return {
      text: rows.length
        ? `${rows.length} matching appointment${rows.length === 1 ? "" : "s"}:\n\n${rows.map((a) => `${format(a.start, "EEE d MMM, HH:mm")} — ${appointmentContact(a).name} · ${a.status}`).join("\n")}`
        : "No appointments match that request in your local demo data.",
      source: "appointments",
      sourceTitle: "Appointments · local demo data",
    };
  }
  const people = allContacts(appointments);
  const person = people.find(
    (c) =>
      q.includes(c.name.toLowerCase()) ||
      q.includes(c.email.toLowerCase()) ||
      c.name.split(" ").some((part) => part.length > 3 && q.includes(part.toLowerCase())),
  );
  if (person)
    return {
      text: `${person.name} — ${person.company}\nEmail: ${person.email}\nPhone: ${person.phone}\n${contactMeetings(person, appointments).length} meetings in this workspace.`,
      source: "contacts",
      sourceTitle: `${person.name} · local contact`,
    };
  if (/contact|companies|people/.test(q))
    return {
      text: `${people.length} contacts:\n${people.map((c) => `${c.name} — ${c.company}`).join("\n")}`,
      source: "contacts",
      sourceTitle: "Contacts · local demo data",
    };
  return {
    text: "I’m a simulated assistant. Ask about tomorrow, pending confirmations, your week, cancellations, a contact’s details, or a named document. No real AI or document retrieval is connected.",
  };
}
