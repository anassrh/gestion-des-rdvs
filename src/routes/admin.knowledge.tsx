import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatCard, EmptyState } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/app/confirm-dialog";
import { initialDocs, type KnowledgeDoc } from "@/lib/mock-data";
import { useDemoState } from "@/hooks/use-demo-state";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/knowledge")({
  component: KnowledgePage,
  head: () => ({ meta: [{ title: "Knowledge — RdvFlow" }] }),
});
import { knowledgeExcerpt } from "@/lib/knowledge";

function DocumentCard({
  doc: d,
  view,
  index,
  remove,
}: {
  doc: KnowledgeDoc;
  view: () => void;
  index: () => void;
  remove: () => void;
}) {
  return (
    <article className="surface-card flex flex-wrap items-center gap-4 p-5">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <h2 className="break-all text-sm font-medium">{d.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {d.size} · Uploaded {d.uploaded} · {d.chunks} mock chunks
        </p>
      </div>
      <div className="text-xs">
        <p className={d.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
          {d.status === "ready"
            ? "Ready"
            : d.status === "failed"
              ? "Processing failed"
              : d.status === "uploading"
                ? "Uploading locally…"
                : "Processing (demo)…"}
        </p>
        {d.error && <p className="mt-1 max-w-xs text-destructive">{d.error}</p>}
        <p className="mt-1">{d.indexed ? "Indexed" : "Not indexed"}</p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={view}>
          View
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={d.status === "processing" || d.status === "uploading"}
          onClick={index}
        >
          {d.status === "failed" ? "Retry indexing" : "Re-index"}
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
          Delete
        </Button>
      </div>
    </article>
  );
}
function KnowledgePage() {
  const [docs, setDocs] = useDemoState("meridian-docs-v1", initialDocs);
  const [lastUpdate, setLastUpdate] = useDemoState("meridian-docs-updated-v1", "Oct 14, 2026");
  const [viewId, setViewId] = useState<string | null>(null);
  const view = docs.find((d) => d.id === viewId);
  const [remove, setRemove] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter(
      (f) => /\.(pdf|docx|txt)$/i.test(f.name) && f.size > 0 && f.size <= 20 * 1024 * 1024,
    );
    if (accepted.length < files.length)
      toast.error("Use non-empty PDF, DOCX or TXT files up to 20 MB each.");
    const added: KnowledgeDoc[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      uploaded: format(new Date(), "MMM dd, yyyy"),
      status: "uploading",
      stageStartedAt: Date.now(),
      simulateFailure: /demo-fail/i.test(f.name),
      indexed: false,
      chunks: 0,
    }));
    setDocs((rows) => [...added, ...rows]);
    if (added.length) setLastUpdate(format(new Date(), "MMM dd, yyyy · HH:mm"));
    if (added.length)
      toast.success(`${added.length} document(s) added`, {
        description:
          "Watch the simulated upload and indexing stages. No bytes leave your device. Files named demo-fail simulate failure.",
      });
  };
  return (
    <>
      <PageHeader title="Knowledge" description="A shared foundation for better answers." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Documents" value={docs.length} />
        <StatCard label="Indexed" value={docs.filter((d) => d.indexed).length} />
        <StatCard label="Mock chunks" value={docs.reduce((n, d) => n + d.chunks, 0)} />
        <StatCard label="Last update" value={lastUpdate} />
      </div>
      <input
        ref={input}
        className="hidden"
        type="file"
        multiple
        accept=".pdf,.docx,.txt"
        aria-label="Upload documents"
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        className={`mb-6 flex w-full flex-col items-center rounded-xl border border-dashed p-10 text-center transition-colors ${dragging ? "border-primary bg-primary-soft" : "hover:bg-secondary"}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
      >
        <Upload className="h-6 w-6 text-primary" />
        <span className="mt-3 font-medium">Drop documents here, or browse files</span>
        <span className="mt-2 text-sm text-muted-foreground">
          PDF, DOCX, TXT · Up to 20 MB · Mock indexing, stored locally
        </span>
      </button>
      <div className="space-y-3">
        {docs.map((d) => (
          <DocumentCard
            key={d.id}
            doc={d}
            view={() => setViewId(d.id)}
            remove={() => setRemove(d.id)}
            index={() => {
              setLastUpdate(format(new Date(), "MMM dd, yyyy · HH:mm"));
              setDocs((rows) =>
                rows.map((r) =>
                  r.id === d.id
                    ? {
                        ...r,
                        status: "processing",
                        indexed: false,
                        chunks: 0,
                        stageStartedAt: Date.now(),
                        simulateFailure: false,
                        error: undefined,
                      }
                    : r,
                ),
              );
              toast("Simulated indexing started");
            }}
          />
        ))}
      </div>
      {!docs.length && (
        <EmptyState
          icon={FileText}
          title="Your knowledge starts here"
          description="Add a document to populate this demo library."
        />
      )}
      <Dialog open={!!view} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-all">{view?.name}</DialogTitle>
            <DialogDescription>Document metadata and sample preview</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed">{view ? knowledgeExcerpt(view) : ""}</p>
          <p className="text-xs text-muted-foreground">
            {view?.chunks} mock chunks · Original file contents are not retained.
          </p>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog
        open={!!remove}
        onOpenChange={(o) => !o && setRemove(null)}
        title="Delete this document?"
        description="Remove this document from the local demo library."
        confirmLabel="Delete document"
        destructive
        onConfirm={() => {
          setLastUpdate(format(new Date(), "MMM dd, yyyy · HH:mm"));
          setDocs((rows) => rows.filter((r) => r.id !== remove));
          setRemove(null);
        }}
      />
    </>
  );
}
