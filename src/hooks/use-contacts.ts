import { useRemoteCore } from "@/lib/supabase/core-context";
import { useAppointments } from "@/lib/appointments-store";
import { allContacts } from "@/lib/contact-selectors";
export function useContacts() {
  const core = useRemoteCore();
  const { appointments } = useAppointments();
  return core ? core.contacts : allContacts(appointments);
}
