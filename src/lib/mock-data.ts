import { addDays, setHours, setMinutes, startOfDay, subDays } from "date-fns";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type MeetingType = "client" | "technical" | "recruitment" | "partnership" | "internal";
export type ReminderStatus = "sent" | "scheduled" | "failed" | "none";

export const MEETING_TYPES: { value: MeetingType; label: string; long: string }[] = [
  { value: "client", label: "Client", long: "Client meeting" },
  { value: "technical", label: "Technical", long: "Technical discussion" },
  { value: "recruitment", label: "Recruitment", long: "Recruitment / interview" },
  { value: "partnership", label: "Partnership", long: "Partnership" },
  { value: "internal", label: "Internal", long: "Internal / other" },
];

export const meetingLabel = (t: MeetingType) => MEETING_TYPES.find((m) => m.value === t)?.long ?? t;
export const meetingShort = (t: MeetingType) => MEETING_TYPES.find((m) => m.value === t)?.label ?? t;

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

export interface HistoryEvent {
  at: Date;
  label: string;
}

export interface Appointment {
  id: string;
  token: string;
  contactId: string;
  start: Date;
  duration: number;
  type: MeetingType;
  status: AppointmentStatus;
  reminder: ReminderStatus;
  notes: string;
  createdAt: Date;
  history: HistoryEvent[];
}

export const contacts: Contact[] = [
  { id: "c1", name: "Marie Dupont", company: "Acme Consulting", role: "Managing Partner", email: "marie.dupont@acme-consulting.fr", phone: "+33 6 12 34 56 78", notes: "Interested in a long-term platform audit. Prefers morning slots." },
  { id: "c2", name: "Thomas Bernard", company: "Nova Labs", role: "Head of Engineering", email: "thomas@novalabs.io", phone: "+33 6 98 76 54 32", notes: "Evaluating migration to an event-driven architecture." },
  { id: "c3", name: "Sarah Martin", company: "Freelance", role: "Product Designer", email: "sarah.martin@studio.design", phone: "+33 7 45 12 89 63", notes: "Candidate for the design-system lead role." },
  { id: "c4", name: "Julien Robert", company: "Horizon Digital", role: "CEO", email: "j.robert@horizon-digital.com", phone: "+33 6 33 21 45 67", notes: "Potential partnership on AI tooling." },
  { id: "c5", name: "Emma Laurent", company: "Vertex AI", role: "Solutions Architect", email: "emma.laurent@vertex.ai", phone: "+33 6 77 88 99 00", notes: "Technical deep dive on RAG pipelines." },
  { id: "c6", name: "David Moreau", company: "Bluefin Capital", role: "Investment Director", email: "d.moreau@bluefin.vc", phone: "+33 6 11 22 33 44", notes: "Quarterly portfolio check-in." },
  { id: "c7", name: "Léa Petit", company: "Internal", role: "Engineering Manager", email: "lea.petit@company.com", phone: "+33 6 55 44 33 22", notes: "Weekly 1:1." },
  { id: "c8", name: "Hugo Lambert", company: "Kinetic Studio", role: "CTO", email: "hugo@kinetic.studio", phone: "+33 6 66 77 11 22", notes: "Peer exchange on hiring practices." },
];

export const contactById = (id: string) => contacts.find((c) => c.id === id)!;

const today = startOfDay(new Date());
const at = (dayOffset: number, h: number, m = 0) =>
  setMinutes(setHours(addDays(today, dayOffset), h), m);

let n = 0;
function appt(
  contactId: string,
  start: Date,
  type: MeetingType,
  status: AppointmentStatus,
  reminder: ReminderStatus,
  duration = 30,
  notes = "",
): Appointment {
  n += 1;
  const createdAt = subDays(start, 6);
  const history: HistoryEvent[] = [{ at: createdAt, label: "Appointment booked via public page" }];
  if (reminder === "sent") history.push({ at: subDays(start, 1), label: "Reminder email sent (24h)" });
  if (status === "confirmed") history.push({ at: subDays(start, 3), label: "Guest confirmed attendance" });
  if (status === "cancelled") history.push({ at: subDays(start, 2), label: "Guest cancelled the appointment" });
  if (status === "completed") history.push({ at: start, label: "Meeting marked as completed" });
  return {
    id: `a${n}`,
    token: `tk-${(1000 + n * 7919).toString(36)}`,
    contactId,
    start,
    duration,
    type,
    status,
    reminder,
    notes,
    createdAt,
    history,
  };
}

export const initialAppointments: Appointment[] = [
  appt("c1", at(0, 9), "client", "confirmed", "sent", 45, "Review Q4 roadmap and audit scope."),
  appt("c2", at(0, 10, 30), "technical", "confirmed", "sent", 60, "Event sourcing vs. CDC trade-offs."),
  appt("c3", at(0, 14), "recruitment", "pending", "sent", 45, "Portfolio walkthrough."),
  appt("c7", at(0, 16), "internal", "confirmed", "none", 30, "Weekly 1:1."),
  appt("c4", at(1, 9, 30), "partnership", "pending", "scheduled", 45, "Co-marketing proposal."),
  appt("c5", at(1, 11), "technical", "confirmed", "scheduled", 60, "RAG evaluation framework."),
  appt("c6", at(1, 15, 30), "client", "pending", "scheduled", 30),
  appt("c8", at(2, 10), "internal", "confirmed", "scheduled", 30),
  appt("c1", at(3, 14), "client", "pending", "scheduled", 30, "Follow-up on proposal."),
  appt("c2", at(4, 11, 30), "technical", "cancelled", "none", 45, "Rescheduled by guest."),
  appt("c5", at(6, 9), "partnership", "confirmed", "scheduled", 45),
  appt("c3", at(7, 15), "recruitment", "pending", "scheduled", 60, "Final round with the team."),
  appt("c4", at(8, 10), "client", "confirmed", "scheduled", 30),
  appt("c6", at(-1, 11), "client", "completed", "sent", 30),
  appt("c8", at(-2, 16), "technical", "completed", "sent", 45),
  appt("c2", at(-3, 9, 30), "technical", "cancelled", "sent", 30),
  appt("c7", at(-5, 16), "internal", "completed", "none", 30),
  appt("c1", at(-8, 10), "client", "completed", "sent", 45),
];

export interface ActivityItem {
  id: string;
  text: string;
  ago: string;
  kind: "confirm" | "reschedule" | "reminder" | "cancel" | "booking";
}

export const recentActivity: ActivityItem[] = [
  { id: "r1", text: "Marie Dupont confirmed her appointment", ago: "12 min ago", kind: "confirm" },
  { id: "r2", text: "Thomas Bernard rescheduled from 14:00 to 15:30", ago: "1 h ago", kind: "reschedule" },
  { id: "r3", text: "Reminder sent to David Moreau", ago: "2 h ago", kind: "reminder" },
  { id: "r4", text: "Julien Robert booked a partnership meeting", ago: "Yesterday", kind: "booking" },
  { id: "r5", text: "Thomas Bernard cancelled a technical discussion", ago: "2 days ago", kind: "cancel" },
];

export interface Automation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun: string;
  successRate: number;
  runs: number;
}

export const initialAutomations: Automation[] = [
  { id: "w1", name: "Appointment confirmation", description: "Confirms every new booking to the guest.", trigger: "When appointment is created", action: "Send confirmation email", enabled: true, lastRun: "8 min ago", successRate: 99.4, runs: 312 },
  { id: "w2", name: "Reminder 24 hours before", description: "Reduces no-shows with a timely reminder.", trigger: "24h before appointment", action: "Send reminder", enabled: true, lastRun: "2 h ago", successRate: 98.1, runs: 287 },
  { id: "w3", name: "Pending confirmation follow-up", description: "Nudges guests who have not confirmed yet.", trigger: "No confirmation after 24h", action: "Send follow-up", enabled: true, lastRun: "Yesterday", successRate: 94.7, runs: 76 },
  { id: "w4", name: "Cancellation notification", description: "Keeps you informed of every cancellation.", trigger: "Appointment cancelled", action: "Notify admin", enabled: false, lastRun: "3 days ago", successRate: 100, runs: 18 },
];

export type DocStatus = "processing" | "ready" | "failed";
export interface KnowledgeDoc {
  id: string;
  name: string;
  size: string;
  uploaded: string;
  status: DocStatus;
  chunks: number;
  indexed: boolean;
}

export const initialDocs: KnowledgeDoc[] = [
  { id: "d1", name: "Onboarding-Guide-2026.pdf", size: "2.4 MB", uploaded: "Oct 12, 2026", status: "ready", chunks: 142, indexed: true },
  { id: "d2", name: "Cancellation-Policy.docx", size: "84 KB", uploaded: "Oct 10, 2026", status: "ready", chunks: 18, indexed: true },
  { id: "d3", name: "Pricing-Consulting-Services.pdf", size: "1.1 MB", uploaded: "Oct 08, 2026", status: "ready", chunks: 64, indexed: true },
  { id: "d4", name: "Architecture-Principles.txt", size: "36 KB", uploaded: "Oct 14, 2026", status: "processing", chunks: 0, indexed: false },
  { id: "d5", name: "Q3-Board-Deck-scan.pdf", size: "12.8 MB", uploaded: "Oct 02, 2026", status: "failed", chunks: 0, indexed: false },
];

/** Deterministic availability for the public booking calendar. */
export function slotsForDate(d: Date): string[] {
  const day = d.getDay();
  if (day === 0 || day === 6) return [];
  const all = ["09:00", "10:00", "11:30", "14:00", "15:30", "17:00"];
  const seed = d.getDate() + d.getMonth() * 31;
  if (seed % 9 === 0) return [];
  return all.filter((_, i) => (seed + i * 3) % 5 !== 0);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
