import { z } from "zod";

const webhook = "https://drobi.app.n8n.cloud/webhook/meridian-ai-assistant";
export const assistantErrorMessage =
  "Je n'arrive pas à récupérer les informations pour le moment. Réessayez dans quelques instants.";
const responseSchema = z.object({
  success: z.literal(true),
  answer: z.string().trim().min(1),
  intent: z.string().optional(),
  sources: z
    .array(z.object({ type: z.string(), id: z.string(), label: z.string() }))
    .optional()
    .default([]),
});
export type AssistantSource = z.infer<typeof responseSchema>["sources"][number];

export async function askAssistant(
  question: string,
  conversationId?: string,
  fetcher: typeof fetch = fetch,
) {
  try {
    const response = await fetcher(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.trim(),
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error("Assistant unavailable");
    const result = responseSchema.parse(await response.json());
    return { answer: result.answer, sources: result.sources };
  } catch {
    return { answer: assistantErrorMessage, sources: [] as AssistantSource[] };
  }
}
