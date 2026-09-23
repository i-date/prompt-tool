import { parseTagInput } from "../../lib/phrases/text";
import type { Phrase, PhraseInput } from "../../lib/phrases/types";

export type PhraseDraft = { ja: string; en: string; categoryId: string; tags: string; candidate: boolean };
export const emptyDraft: PhraseDraft = { ja: "", en: "", categoryId: "", tags: "", candidate: true };

export const toDraft = (p: Phrase): PhraseDraft => ({
  ja: p.ja, en: p.en, categoryId: p.categoryId ?? "", tags: p.tags.join(", "), candidate: p.candidate,
});
export const fromDraft = (d: PhraseDraft): PhraseInput => ({
  ja: d.ja.trim(), en: d.en.trim(), categoryId: d.categoryId || null, tags: parseTagInput(d.tags), candidate: d.candidate,
});
