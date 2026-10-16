import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { askAssistant, type AssistantSource } from "@/lib/integrations/ai-assistant";
import { ArrowUp, BookOpen, CalendarDays, MessageSquare, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDemoState } from "@/hooks/use-demo-state";

export const Route = createFileRoute("/admin/chat")({
  component: ChatPage,
  head: () => ({ meta: [{ title: "AI Assistant — RdvFlow" }] }),
});
type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: AssistantSource[];
};
type Conversation = { id: string; title: string; messages: Message[] };
const prompts = [
  "Quels rendez-vous ai-je demain ?",
  "Quelles réunions attendent encore une confirmation ?",
  "Résumez ma semaine.",
  "Qui a annulé ce mois-ci ?",
  "Combien de rendez-vous ai-je cette semaine ?",
];
function ChatMessage({ message }: { message: Message }) {
  return (
    <div
      className={
        message.role === "user"
          ? "ml-auto max-w-[90%] rounded-2xl bg-secondary px-5 py-3 text-sm"
          : "max-w-full py-4 text-sm leading-relaxed"
      }
    >
      <p className="whitespace-pre-wrap">{message.text}</p>
      {!!message.sources?.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.sources.map((source, index) => (
            <span
              key={`${source.type}-${source.id}-${index}`}
              className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground"
            >
              <BookOpen className="h-3 w-3" />
              {source.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
function ChatPage() {
  const [conversations, setConversations] = useDemoState<Conversation[]>("meridian-chat-v1", []);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const current = conversations.find((c) => c.id === active);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current?.messages.length, busy]);
  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending.current) return;
    sending.current = true;
    setBusy(true);
    const id = current?.id ?? crypto.randomUUID();
    const userMessage: Message = { role: "user", text: question };
    setConversations((rows) =>
      current
        ? rows.map((c) => (c.id === id ? { ...c, messages: [...c.messages, userMessage] } : c))
        : [{ id, title: question.slice(0, 55), messages: [userMessage] }, ...rows],
    );
    setActive(id);
    setInput("");
    try {
      const response = await askAssistant(question, current?.id);
      setConversations((rows) =>
        rows.map((c) =>
          c.id === id
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { role: "assistant", text: response.answer, sources: response.sources },
                ],
              }
            : c,
        ),
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="surface-card grid min-h-[calc(100svh-10rem)] overflow-hidden xl:grid-cols-[190px_1fr_210px]">
      <aside className="border-b bg-secondary/30 p-4 xl:border-r xl:border-b-0">
        <Button
          disabled={busy}
          variant="outline"
          className="w-full"
          onClick={() => setActive(null)}
        >
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
        <p className="eyebrow mt-6 mb-3">History</p>
        <div className="flex gap-2 overflow-x-auto xl:flex-col">
          {conversations.map((c) => (
            <button
              key={c.id}
              disabled={busy}
              onClick={() => setActive(c.id)}
              className={`min-w-32 rounded-lg p-2 text-left text-xs hover:bg-secondary ${active === c.id ? "bg-secondary" : ""}`}
            >
              <MessageSquare className="mb-2 h-3.5 w-3.5" />
              <span className="line-clamp-2">{c.title}</span>
            </button>
          ))}
          {!conversations.length && (
            <p className="text-xs text-muted-foreground">Your conversations appear here.</p>
          )}
        </div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <header className="border-b p-5">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Posez vos questions sur vos rendez-vous et consultez les références des réponses.
          </p>
        </header>
        <div
          className="max-h-[65svh] flex-1 space-y-3 overflow-y-auto p-5 md:p-8"
          aria-live="polite"
        >
          {current ? (
            current.messages.map((m, i) => <ChatMessage key={i} message={m} />)
          ) : (
            <div className="py-8">
              <p className="eyebrow">A little clarity for your day</p>
              <h2 className="mt-3 text-2xl font-medium">What would you like to know?</h2>
              <div className="mt-8 grid gap-2">
                {prompts.map((p) => (
                  <button
                    key={p}
                    disabled={busy}
                    onClick={() => send(p)}
                    className="rounded-xl border p-3 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {busy && (
          <p role="status" className="px-6 py-3 text-sm text-muted-foreground">
            Préparation de la réponse…
          </p>
        )}
        <div ref={end} />
        <form
          className="border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              disabled={busy}
              aria-label="Message assistant"
              placeholder="Ask about your appointments…"
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              className="min-h-12 resize-none"
              rows={2}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={busy || !input.trim()}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Vérifiez les informations importantes à l’aide des références fournies.
          </p>
        </form>
      </section>
      <aside className="hidden border-l bg-secondary/20 p-5 xl:block">
        <h2 className="eyebrow">Data sources</h2>
        <Link to="/admin/appointments" className="mt-6 block text-sm">
          <CalendarDays className="mb-2 h-4 w-4 text-primary" />
          Appointments
          <p className="mt-1 text-xs text-muted-foreground">Vos rendez-vous enregistrés.</p>
        </Link>
        <Link to="/admin/knowledge" className="mt-6 block text-sm">
          <BookOpen className="mb-2 h-4 w-4 text-primary" />
          Knowledge base
          <p className="mt-1 text-xs text-muted-foreground">
            Documents de votre espace de travail.
          </p>
        </Link>
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Les références disponibles apparaissent sous chaque réponse.
        </p>
      </aside>
    </div>
  );
}
