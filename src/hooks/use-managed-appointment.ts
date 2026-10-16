import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRemoteCore } from "@/lib/supabase/core-context";
import { useAppointments } from "@/lib/appointments-store";
export function useManagedAppointment(token: string | undefined) {
  const core = useRemoteCore();
  const store = useAppointments();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["supabase", "managed", token ?? null],
    enabled: !!core && !!token,
    retry: 0,
    refetchInterval: 15000,
    queryFn: () => core!.repository.managed(token!),
  });
  const change = async (
    action: "confirm" | "cancel" | "reschedule",
    input: Record<string, unknown> = {},
  ) => {
    if (!token) throw new Error("A valid management link is required.");
    if (core) {
      // The URL capability is sufficient; never resolve it through temporary owner/store state.
      const updated = await core.repository.change("", action, input, token);
      queryClient.setQueryData(["supabase", "managed", token], updated);
      void core.refresh().catch(() => {});
    } else {
      const a = store.appointments.find((a) => a.token === token);
      if (!a) throw new Error("Appointment not found.");
      if (action === "reschedule")
        await store.reschedule(a.id, new Date(input["starts_at"] as string));
      else await store.setStatus(a.id, action === "confirm" ? "confirmed" : "cancelled");
    }
  };
  return {
    appointment: core ? query.data : store.appointments.find((a) => a.token === token),
    loading: core ? !!token && query.isPending : !store.ready,
    error: core ? query.error?.message : undefined,
    retry: () => query.refetch(),
    confirm: () => change("confirm"),
    cancel: () => change("cancel"),
    reschedule: (start: Date) => change("reschedule", { starts_at: start.toISOString() }),
  };
}
