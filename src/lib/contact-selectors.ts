import { contacts, type Appointment, type Contact } from "./mock-data";

export const contactKey = (contact: Contact) => contact.email.trim().toLowerCase();
export function appointmentContact(a: Appointment): Contact {
  return a.guest ?? contacts.find((c) => c.id === a.contactId)!;
}
export function allContacts(appointments: Appointment[]) {
  const result = new Map(contacts.map((c) => [contactKey(c), c]));
  for (const a of appointments) {
    if (a.guest && !result.has(contactKey(a.guest)))
      result.set(contactKey(a.guest), { ...a.guest, id: `email:${contactKey(a.guest)}` });
  }
  return [...result.values()];
}
export function contactMeetings(contact: Contact, appointments: Appointment[]) {
  return appointments
    .filter((a) => contactKey(appointmentContact(a)) === contactKey(contact))
    .sort((a, b) => +a.start - +b.start);
}
