import { describe, expect, it, vi } from "vitest";
import { askAssistant, assistantErrorMessage } from "@/lib/integrations/ai-assistant";

describe("Real assistant webhook", () => {
  it("sends only the question and existing conversation ID and maps the answer and sources", async () => {
    const sources = [{ type: "appointment", id: "appointment-id", label: "Client — demain 10:00" }];
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        success: true,
        answer: "Votre réponse.",
        intent: "appointments_tomorrow",
        sources,
      }),
    );
    expect(
      await askAssistant("  Quels rendez-vous ai-je demain ?  ", "conversation-id", fetcher),
    ).toEqual({ answer: "Votre réponse.", sources });
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://drobi.app.n8n.cloud/webhook/meridian-ai-assistant");
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(request.body)).toEqual({
      question: "Quels rendez-vous ai-je demain ?",
      conversation_id: "conversation-id",
    });
  });
  it("omits the optional ID on the first question and accepts missing sources", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true, answer: "Bonjour." }));
    expect(await askAssistant("Bonjour", undefined, fetcher)).toEqual({
      answer: "Bonjour.",
      sources: [],
    });
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ question: "Bonjour" });
  });
  it.each(["http", "network", "invalid-json", "failure", "empty-answer"])(
    "returns the clean French message on %s failure",
    async (failure) => {
      const fetcher =
        failure === "network"
          ? vi.fn().mockRejectedValue(new Error("Private technical stack"))
          : vi
              .fn()
              .mockResolvedValue(
                failure === "http"
                  ? new Response("Technical upstream error", { status: 500 })
                  : failure === "invalid-json"
                    ? new Response("not JSON")
                    : Response.json({ success: failure !== "failure", answer: "" }),
              );
      expect(await askAssistant("Question", undefined, fetcher)).toEqual({
        answer: assistantErrorMessage,
        sources: [],
      });
    },
  );
});
