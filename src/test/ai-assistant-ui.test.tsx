import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { askAssistant, assistantErrorMessage } from "@/lib/integrations/ai-assistant";
import { Route } from "@/routes/admin.chat";

vi.mock("@/lib/integrations/ai-assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/integrations/ai-assistant")>()),
  askAssistant: vi.fn(),
}));
const ChatPage = Route.options.component as ComponentType;
// Only the page body is under test; links keep the same labels and destinations.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      className,
    }: {
      children: React.ReactNode;
      to: string;
      className?: string;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

beforeEach(() => {
  localStorage.clear();
  vi.mocked(askAssistant).mockReset();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("Assistant chat UI", () => {
  it("shows the question and loading immediately, then the returned answer and source references", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof askAssistant>>) => void;
    vi.mocked(askAssistant).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<ChatPage />);
    const question = "Quels rendez-vous ai-je demain ?";
    fireEvent.click(screen.getByRole("button", { name: question }));
    expect(screen.getByText(question, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Préparation de la réponse");
    await act(async () =>
      resolve({
        answer: "Vous avez un rendez-vous demain.",
        sources: [{ type: "appointment", id: "a1", label: "Client — 10:00" }],
      }),
    );
    expect(screen.getByText("Vous avez un rendez-vous demain.")).toBeInTheDocument();
    expect(screen.getByText("Client — 10:00")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("meridian-chat-v1")!);
    vi.mocked(askAssistant).mockResolvedValueOnce({
      answer: "Suite de la conversation.",
      sources: [],
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Message assistant" }), {
      target: { value: "Et cette semaine ?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Suite de la conversation.");
    expect(askAssistant).toHaveBeenLastCalledWith("Et cette semaine ?", stored[0].id);
    expect(screen.getByText(question, { selector: "p" })).toBeInTheDocument();
  });
  it.each([
    "Quels rendez-vous ai-je demain ?",
    "Quelles réunions attendent encore une confirmation ?",
    "Résumez ma semaine.",
    "Qui a annulé ce mois-ci ?",
    "Combien de rendez-vous ai-je cette semaine ?",
  ])("sends the suggested question: %s", async (question) => {
    vi.mocked(askAssistant).mockResolvedValue({ answer: "Réponse réelle.", sources: [] });
    render(<ChatPage />);
    fireEvent.click(screen.getByRole("button", { name: question }));
    await waitFor(() => expect(askAssistant).toHaveBeenCalledWith(question, undefined));
    await screen.findByText("Réponse réelle.");
  });
  it("renders a recoverable error as an assistant message and keeps the conversation", async () => {
    vi.mocked(askAssistant).mockResolvedValue({ answer: assistantErrorMessage, sources: [] });
    render(<ChatPage />);
    fireEvent.click(screen.getByRole("button", { name: "Résumez ma semaine." }));
    await screen.findByText(assistantErrorMessage);
    expect(screen.getByText("Résumez ma semaine.", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message assistant" })).toBeEnabled();
  });
});
