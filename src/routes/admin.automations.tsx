import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Workflow } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { initialAutomations, type Automation } from "@/lib/mock-data";
import { useDemoState } from "@/hooks/use-demo-state";

export const Route = createFileRoute("/admin/automations")({
  component: AutomationsPage,
  head: () => ({ meta: [{ title: "Automations — RdvFlow" }] }),
});

function AutomationCard({
  automation: a,
  onToggle,
  onEdit,
  onTest,
  running,
}: {
  automation: Automation;
  onToggle: () => void;
  onEdit: () => void;
  onTest: () => void;
  running: boolean;
}) {
  return (
    <section className="surface-card p-6">
      <div className="flex items-start gap-3">
        <Workflow className="mt-1 h-5 w-5 text-primary" />
        <div className="flex-1">
          <h2 className="font-medium">{a.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
        </div>
        <Switch checked={a.enabled} onCheckedChange={onToggle} aria-label={`Enable ${a.name}`} />
      </div>
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="eyebrow">Trigger</dt>
          <dd className="mt-1">{a.trigger}</dd>
        </div>
        <div>
          <dt className="eyebrow">Action</dt>
          <dd className="mt-1">{a.action}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
        <span>{a.enabled ? "Enabled" : "Disabled"}</span>
        <span>Last run: {a.lastRun}</span>
        <span className={a.lastResult === "failed" ? "text-destructive" : ""}>
          Result: {a.lastResult ?? (a.runs ? "success" : "never run")}
          {a.lastError ? ` — ${a.lastError}` : ""}
        </span>
        <span>
          {a.successRate}% success · {a.runs} runs
        </span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" disabled={!a.enabled || running} onClick={onTest}>
          {running ? "Running demo…" : "Test run"}
        </Button>
      </div>
    </section>
  );
}
function AutomationsPage() {
  const [items, setItems] = useDemoState("meridian-automations-v1", initialAutomations);
  const [draft, setDraft] = useState<Automation | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"success" | "failed">("success");
  return (
    <>
      <PageHeader title="Automations" description="Thoughtful follow-ups, without the busywork." />
      <p className="mb-6 rounded-lg border bg-secondary px-4 py-3 text-sm text-muted-foreground">
        Demo workflows · Preferences are saved in this browser. No messages are sent.
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((a) => (
          <AutomationCard
            key={a.id}
            automation={a}
            running={running === a.id}
            onTest={() => {
              setRunning(a.id);
              setTimeout(() => {
                setItems((rows) =>
                  rows.map((r) => {
                    if (r.id !== a.id) return r;
                    const successRate =
                      Math.round(
                        (((r.successRate * r.runs) / 100 + (outcome === "success" ? 1 : 0)) /
                          (r.runs + 1)) *
                          1000,
                      ) / 10;
                    return {
                      ...r,
                      runs: r.runs + 1,
                      successRate,
                      lastRun: new Date().toLocaleString(),
                      lastResult: outcome,
                      lastError:
                        outcome === "failed"
                          ? "Simulated delivery failure; edit the outcome and retry."
                          : undefined,
                    };
                  }),
                );
                setRunning(null);
                if (outcome === "success")
                  toast.success("Demo execution succeeded; no message sent");
                else toast.error("Simulated execution failed; no message sent");
              }, 500);
            }}
            onToggle={() =>
              setItems((rows) =>
                rows.map((r) => (r.id === a.id ? { ...r, enabled: !r.enabled } : r)),
              )
            }
            onEdit={() => setDraft({ ...a })}
          />
        ))}
      </div>
      <label className="mt-6 flex max-w-sm items-center gap-3 text-sm">
        <span>Test run outcome</span>
        <select
          className="rounded-md border bg-card p-2"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as typeof outcome)}
        >
          <option value="success">Success (simulated)</option>
          <option value="failed">Failure (simulated)</option>
        </select>
      </label>
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit automation</DialogTitle>
            <DialogDescription>Configure this simulated workflow.</DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setItems((rows) => rows.map((r) => (r.id === draft.id ? draft : r)));
                setDraft(null);
                toast.success("Automation saved");
              }}
            >
              {(["name", "trigger", "action"] as const).map((field) => (
                <label key={field} className="block space-y-2 text-sm capitalize">
                  <span>{field}</span>
                  <Input
                    required
                    value={draft[field]}
                    onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                  />
                </label>
              ))}
              <Button type="submit">Save changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
