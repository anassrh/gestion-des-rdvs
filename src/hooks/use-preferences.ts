import { defaultSettings } from "@/lib/preferences";
import { initialAutomations } from "@/lib/mock-data";
import { useDemoState } from "./use-demo-state";
import { useRemoteCore } from "@/lib/supabase/core-context";
export const workflowPreferences = (items: typeof initialAutomations) => ({
  confirmation: items.find((a) => a.id === "w1")?.enabled ?? false,
  emailReminder: items.find((a) => a.id === "w2")?.enabled ?? false,
  followup: items.find((a) => a.id === "w3")?.enabled ?? false,
  cancellation: items.find((a) => a.id === "w4")?.enabled ?? false,
});
export function usePreferences() {
  const remote = useRemoteCore();
  const [settings] = useDemoState("meridian-settings-v1", defaultSettings);
  const [automations] = useDemoState("meridian-automations-v1", initialAutomations);
  return { ...(remote?.settings ?? settings), ...workflowPreferences(automations) };
}
