import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { initialAppointments, type Appointment, type AppointmentStatus } from "./mock-data";
import { useDemoState } from "@/hooks/use-demo-state";
import { defaultSettings } from "./preferences";
import { assertMeeting, assertTransition, reviveAppointments } from "./appointment-rules";
import { availableSlots } from "./availability";
import { allContacts, contactKey } from "./contact-selectors";
import { usePreferences } from "@/hooks/use-preferences";
import { useKnowledgeLifecycle } from "@/hooks/use-knowledge-lifecycle";

export interface MockStore {
  appointments: Appointment[];
  ready: boolean;
  setStatus: (id: string, status: AppointmentStatus) => void;
  reschedule: (id: string, start: Date) => void;
  add: (
    a: Omit<Appointment, "id" | "token" | "history" | "createdAt">,
    origin?: "public" | "admin",
  ) => string;
  update: (id: string, changes: Pick<Appointment, "duration" | "type" | "notes">) => void;
}
export const MockAppointmentsContext = createContext<MockStore | null>(null);
export function MockAppointmentsProvider({ children }: { children: ReactNode }) {
  useKnowledgeLifecycle();
  const [appointments, setAppointments, ready] = useDemoState(
    "meridian-appointments-v1",
    initialAppointments,
    reviveAppointments,
  );
  const settings = usePreferences();
  const update = useCallback<MockStore["update"]>(
    (id, changes) => {
      setAppointments((list) =>
        list.map((a) => {
          if (a.id !== id) return a;
          if (a.status === "cancelled" || a.status === "completed")
            throw new Error("Closed appointments cannot be edited.");
          assertMeeting(a.start, changes.duration, list, settings.buffer, id);
          return {
            ...a,
            ...changes,
            history: [...a.history, { at: new Date(), label: "Appointment details edited" }],
          };
        }),
      );
    },
    [setAppointments, settings.buffer],
  );
  const setStatus = useCallback<MockStore["setStatus"]>(
    (id, status) => {
      setAppointments((list) =>
        list.map((a) => {
          if (a.id !== id || a.status === status) return a;
          assertTransition(a, status);
          return {
            ...a,
            status,
            reminder:
              status === "cancelled" || status === "completed"
                ? "none"
                : settings.emailReminder
                  ? "scheduled"
                  : "none",
            history: [...a.history, { at: new Date(), label: `Status changed to ${status}` }],
          };
        }),
      );
    },
    [setAppointments, settings.emailReminder],
  );
  const reschedule = useCallback<MockStore["reschedule"]>(
    (id, start) => {
      setAppointments((list) =>
        list.map((a) => {
          if (a.id !== id) return a;
          if (a.status === "cancelled" || a.status === "completed")
            throw new Error("Closed appointments cannot be rescheduled.");
          const candidates = list.filter((item) => item.id !== id);
          const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
          if (
            !availableSlots(start, candidates, { ...settings, duration: a.duration }).includes(time)
          )
            throw new Error("This slot is no longer available. Choose another time.");
          assertMeeting(start, a.duration, list, settings.buffer, id);
          return {
            ...a,
            start,
            status: "pending",
            reminder: settings.emailReminder ? "scheduled" : "none",
            history: [
              ...a.history,
              { at: new Date(), label: "Appointment rescheduled; awaiting confirmation" },
            ],
          };
        }),
      );
    },
    [setAppointments, settings],
  );
  const add = useCallback<MockStore["add"]>(
    (a, origin = "admin") => {
      const token = `tk-${crypto.randomUUID()}`;
      setAppointments((list) => {
        if (a.start <= new Date()) throw new Error("Choose a future appointment time.");
        assertMeeting(a.start, a.duration, list, settings.buffer);
        if (origin === "public") {
          const time = `${String(a.start.getHours()).padStart(2, "0")}:${String(a.start.getMinutes()).padStart(2, "0")}`;
          if (!availableSlots(a.start, list, { ...settings, duration: a.duration }).includes(time))
            throw new Error("This slot is no longer available. Choose another time.");
        }
        const known = a.guest
          ? allContacts(list).find((c) => contactKey(c) === contactKey(a.guest!))
          : allContacts(list).find((c) => c.id === a.contactId);
        if (!known && !a.guest) throw new Error("Choose a contact.");
        return [
          ...list,
          {
            ...a,
            guest: a.guest ?? known!,
            contactId: known?.id ?? `email:${contactKey(a.guest!)}`,
            id: token,
            token,
            reminder: settings.emailReminder ? "scheduled" : "none",
            createdAt: new Date(),
            history: [
              {
                at: new Date(),
                label: origin === "public" ? "Appointment requested by client" : "Created by admin",
              },
            ],
          },
        ];
      });
      return token;
    },
    [setAppointments, settings],
  );
  const value = useMemo(
    () => ({ appointments, ready, setStatus, reschedule, add, update }),
    [appointments, ready, setStatus, reschedule, add, update],
  );
  return (
    <MockAppointmentsContext.Provider value={value}>{children}</MockAppointmentsContext.Provider>
  );
}
export function useMockAppointments() {
  const ctx = useContext(MockAppointmentsContext);
  if (!ctx) throw new Error("useAppointments must be used inside AppointmentsProvider");
  return ctx;
}
