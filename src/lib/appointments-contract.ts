import type { Appointment, AppointmentStatus } from "./mock-data";
import type { NewAppointment } from "./supabase/repository";
export interface AppointmentStore {
  appointments: Appointment[];
  ready: boolean;
  add: (appointment: NewAppointment, origin?: "public" | "admin") => string | Promise<string>;
  setStatus: (id: string, status: AppointmentStatus) => void | Promise<void>;
  reschedule: (id: string, start: Date) => void | Promise<void>;
  update: (
    id: string,
    changes: Pick<Appointment, "duration" | "type" | "notes">,
  ) => void | Promise<void>;
  managementToken?: (id: string) => Promise<string>;
  busy?: boolean;
}
