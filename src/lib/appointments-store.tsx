import { useContext, type ReactNode } from "react";
import { MockAppointmentsContext, MockAppointmentsProvider } from "./mock-appointments-store";
import { RemoteAppointmentsContext } from "./supabase/core-context";
import { SupabaseProvider } from "./supabase/provider";
import { supabaseEnabled } from "./supabase/client";
import type { AppointmentStore } from "./appointments-contract";

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  return supabaseEnabled ? (
    <SupabaseProvider>{children}</SupabaseProvider>
  ) : (
    <MockAppointmentsProvider>{children}</MockAppointmentsProvider>
  );
}
export function useAppointments(): AppointmentStore {
  const remote = useContext(RemoteAppointmentsContext);
  const local = useContext(MockAppointmentsContext);
  const value = remote ?? local;
  if (!value) throw new Error("useAppointments must be used inside AppointmentsProvider");
  return value;
}
