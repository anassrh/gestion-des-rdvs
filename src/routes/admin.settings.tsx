import { defaultSettings } from "@/lib/preferences";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDemoState } from "@/hooks/use-demo-state";
import { useEffect, useState } from "react";
import { initialAutomations } from "@/lib/mock-data";
import { workflowPreferences } from "@/hooks/use-preferences";
import { useRemoteCore } from "@/lib/supabase/core-context";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — RdvFlow" }] }),
});

function SettingsPage() {
  const core = useRemoteCore();
  const [localSaved, setSaved] = useDemoState("meridian-settings-v1", defaultSettings);
  const saved = core?.settings ?? localSaved;
  const [automations, setAutomations] = useDemoState("meridian-automations-v1", initialAutomations);
  const [settings, setSettings] = useState(defaultSettings);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setSettings({ ...saved, ...workflowPreferences(automations) });
  }, [saved, automations, dirty]);
  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    setDirty(true);
    setSettings((s) => ({ ...s, [key]: value }));
  };
  return (
    <>
      <PageHeader title="Settings" description="Make room for the way you work." />
      <form
        className="max-w-4xl space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (settings.start >= settings.end || !settings.days.length) {
            toast.error("Choose working days and an end time after your start time.");
            return;
          }
          try {
            if (core) await core.saveSettings(settings);
            else setSaved(settings);
            const preferences = {
              w1: settings.confirmation,
              w2: settings.emailReminder,
              w3: settings.followup,
              w4: settings.cancellation,
            };
            setAutomations((rows) =>
              rows.map((a) => ({
                ...a,
                enabled: preferences[a.id as keyof typeof preferences] ?? a.enabled,
              })),
            );
            setDirty(false);
            toast.success(
              core
                ? "Profile and booking rules saved in Supabase"
                : "Preferences saved in this browser",
            );
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save settings.");
          }
        }}
      >
        <SectionCard title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>Owner timezone</span>
              <Input
                required
                value={settings.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                placeholder="Europe/Paris"
              />
            </label>
            {(["name", "role", "email"] as const).map((key) => (
              <label key={key} className="space-y-2 text-sm capitalize">
                <span>{key}</span>
                <Input
                  required
                  type={key === "email" ? "email" : "text"}
                  value={settings[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Availability">
          <p className="mb-5 text-sm text-muted-foreground">
            Working hours use {settings.timezone}. Guests see available times in their browser
            timezone.
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
              <Button
                key={day}
                type="button"
                aria-pressed={settings.days.includes(i)}
                variant={settings.days.includes(i) ? "default" : "outline"}
                onClick={() =>
                  set(
                    "days",
                    settings.days.includes(i)
                      ? settings.days.filter((d) => d !== i)
                      : [...settings.days, i],
                  )
                }
              >
                {day}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>Start time</span>
              <Input
                required
                type="time"
                value={settings.start}
                onChange={(e) => set("start", e.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>End time</span>
              <Input
                required
                type="time"
                value={settings.end}
                onChange={(e) => set("end", e.target.value)}
              />
            </label>
            {(
              [
                ["duration", "Appointment duration (minutes)", 15, 120],
                ["buffer", "Buffer time (minutes)", 0, 120],
                ["notice", "Minimum notice (hours)", 0, 168],
                ["horizon", "Booking horizon (days)", 1, 365],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key} className="space-y-2 text-sm">
                <span>{label}</span>
                <Input
                  required
                  type="number"
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Notifications & automation preferences">
          <div className="divide-y">
            {(
              [
                ["emailReminder", "Email reminders", "24 hours before each appointment"],
                ["confirmation", "Booking confirmations", "A confirmation for every new booking"],
                ["followup", "Pending follow-ups", "A gentle nudge for unconfirmed meetings"],
                ["cancellation", "Cancellation notifications", "Keep the owner informed"],
              ] as const
            ).map(([key, title, hint]) => (
              <label key={key} className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm">
                  {title}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {hint} · simulated
                  </span>
                </span>
                <Switch checked={settings[key]} onCheckedChange={(v) => set(key, v)} />
              </label>
            ))}
            <div className="flex justify-between py-4 text-sm text-muted-foreground">
              <span>SMS reminders</span>
              <span>Coming later</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Security">
          <p className="text-sm text-muted-foreground">
            {core
              ? "Owner access is protected by Supabase Auth. Account credentials are managed in the Supabase dashboard."
              : "Demo workspace · Authentication and account security are not connected."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                toast(
                  core
                    ? "Manage account credentials in Supabase → Authentication → Users."
                    : "Password management is not connected in demo mode.",
                )
              }
            >
              {core ? "Manage password" : "Change password (demo)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast("Two-factor enrollment is not implemented yet.")}
            >
              Set up two-factor authentication
            </Button>
          </div>
        </SectionCard>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {core
              ? "Profile and scheduling rules are stored in Supabase. Notification switches remain local mock preferences."
              : "Preferences stay on this device. No emails or SMS are sent."}
          </p>
          <Button type="submit" disabled={core?.busy}>
            {core?.busy ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>
    </>
  );
}
