export const documentExcerpt =
  "Demo policy: Guests may cancel or reschedule from their private appointment link. Please give at least 24 hours’ notice. This is sample content, not extracted from a document.";
import type { KnowledgeDoc } from "./mock-data";
export function knowledgeExcerpt(doc: KnowledgeDoc) {
  if (!doc.indexed || doc.status !== "ready")
    return "This document is not indexed. Retry indexing before using it as an assistant source. Processing is simulated.";
  if (/onboarding|cancellation/i.test(doc.name)) return documentExcerpt;
  if (/pricing/i.test(doc.name))
    return "Sample pricing document: Consulting scope and pricing are agreed after an initial discovery meeting. This is demo text, not extracted content.";
  if (/architecture/i.test(doc.name))
    return "Sample architecture principles: Prefer clear interfaces, observable systems and documented decisions. This is demo text, not extracted content.";
  return "Metadata-only demo document. No sample excerpt is defined for this file; it is not parsed or searched.";
}
