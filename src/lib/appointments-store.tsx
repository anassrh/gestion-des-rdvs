import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { initialAppointments, type Appointment, type AppointmentStatus } from "./mock-data";

interface Store {
  appointments: Appointment[];
  setStatus: (id: string, status: AppointmentStatus) => void;
  reschedule: (id: string, start: Date) => void;
  add: (a: Omit<Appointment, "id" | "token" | "history" | "createdAt">) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);

  const setStatus = useCallback((id: string, status: AppointmentStatus) => {
    setAppointments((list) =>
      list.map((a) =>
        a.id === id
          ? { ...a, status, history: [...a.history, { at: new Date(), label: `Status changed to ${status}` }] }
          : a,
      ),
    );
  }, []);

  const reschedule = useCallback((id: string, start: Date) => {
    setAppointments((list) =>
      list.map((a) =>
        a.id === id
          ? { ...a, start, status: "pending", history: [...a.history, { at: new Date(), label: "Appointment rescheduled" }] }
          : a,
      ),
    );
  }, []);

  const add = useCallback<Store["add"]>((a) => {
    setAppointments((list) => [
      ...list,
      {
        ...a,
        id: `new-${Date.now()}`,
        token: `tk-${Date.now().toString(36)}`,
        createdAt: new Date(),
        history: [{ at: new Date(), label: "Created by admin" }],
      },
    ]);
  }, []);

  const value = useMemo(() => ({ appointments, setStatus, reschedule, add }), [appointments, setStatus, reschedule, add]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppointments() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppointments must be used inside AppointmentsProvider");
  return ctx;
}
