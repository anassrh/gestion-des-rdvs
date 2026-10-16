import { useAppointments } from "@/lib/appointments-store";
import { availableSlots } from "@/lib/availability";
import { defaultSettings } from "@/lib/preferences";
import { useDemoState } from "./use-demo-state";
import { usePreferences } from "./use-preferences";
import { useQuery } from "@tanstack/react-query";
import { useRemoteCore } from "@/lib/supabase/core-context";
import { format, isSameDay } from "date-fns";

export function useAvailability(duration?: number, excludeId?: string, managementToken?: string) {
  const { appointments } = useAppointments();
  const settings = usePreferences();
  const core = useRemoteCore();
  const token = managementToken ?? (excludeId ? core?.tokenFor(excludeId) : undefined);
  const query = useQuery({
    queryKey: [
      "supabase",
      "calendar",
      duration ?? null,
      excludeId ?? null,
      token ?? null,
      core?.session?.user.id ?? null,
    ],
    enabled:
      !!core && (!!managementToken || core.authReady) && (!excludeId || !!core.session || !!token),
    retry: 1,
    refetchInterval: 15000,
    queryFn: () =>
      core!.repository.calendar(duration, token, core?.session ? excludeId : undefined),
  });
  return {
    settings,
    loading: core ? query.isPending : false,
    error: core ? query.error?.message : undefined,
    slotsForDate: (date: Date) =>
      core
        ? (query.data?.slots ?? []).filter((s) => isSameDay(s, date)).map((s) => format(s, "HH:mm"))
        : availableSlots(
            date,
            appointments.filter((a) => a.id !== excludeId),
            { ...settings, duration: duration ?? settings.duration },
          ),
  };
}
