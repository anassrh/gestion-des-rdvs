import { useEffect } from "react";
import { format } from "date-fns";
import { initialDocs } from "@/lib/mock-data";
import { useDemoState } from "./use-demo-state";

/** Mounted at the root so mock processing continues while users change pages. */
export function useKnowledgeLifecycle() {
  const [docs, setDocs, ready] = useDemoState("meridian-docs-v1", initialDocs);
  const [, setLastUpdate] = useDemoState("meridian-docs-updated-v1", "Oct 14, 2026");
  useEffect(() => {
    if (!ready) return;
    const timers = docs
      .filter((d) => d.status === "uploading" || d.status === "processing")
      .map((d) =>
        setTimeout(
          () => {
            setDocs((rows) =>
              rows.map((r) =>
                r.id !== d.id || r.status !== d.status
                  ? r
                  : r.status === "uploading"
                    ? { ...r, status: "processing", stageStartedAt: Date.now() }
                    : {
                        ...r,
                        status: r.simulateFailure ? "failed" : "ready",
                        indexed: !r.simulateFailure,
                        chunks: r.simulateFailure ? 0 : r.chunks || 24,
                        error: r.simulateFailure
                          ? "Simulated indexing failure. Retry to run the demo again."
                          : undefined,
                      },
              ),
            );
            setLastUpdate(format(new Date(), "MMM dd, yyyy · HH:mm"));
          },
          Math.max(0, (d.stageStartedAt ?? Date.now()) + 900 - Date.now()),
        ),
      );
    return () => timers.forEach(clearTimeout);
  }, [docs, ready, setDocs, setLastUpdate]);
}
