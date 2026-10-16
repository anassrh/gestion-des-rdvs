import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Contact, Appointment } from "../mock-data";
import type { Settings } from "./mapping";
import type { SupabaseRepository } from "./repository";
import type { AppointmentStore } from "../appointments-contract";
export interface RemoteCore {
  settings: Settings;
  contacts: Contact[];
  session: Session | null;
  authReady: boolean;
  loading: boolean;
  error: string | null;
  adminError: string | null;
  busy: boolean;
  repository: SupabaseRepository;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  rememberManaged: (appointment: Appointment) => void;
  tokenFor: (id: string) => string | undefined;
}
export const RemoteCoreContext = createContext<RemoteCore | null>(null);
export const RemoteAppointmentsContext = createContext<AppointmentStore | null>(null);
export const useRemoteCore = () => useContext(RemoteCoreContext);
