import { collator } from "./sort";
import { norm, normalizeTags } from "./text";
import type { Phrase, PhraseData } from "./types";

export const UNCATEGORIZED = "__none__";
export type PhraseFilter = { query: string; categoryId: string; tag: string };
export const EMPTY_FILTER: PhraseFilter = { query: "", categoryId: "", tag: "" };

export const isFilterActive = (f: PhraseFilter): boolean =>
  f.query.trim() !== "" || f.categoryId !== "" || f.tag !== "";

/** 空白区切りは AND。日本語・英語・カテゴリ名・タグを横断して部分一致 */
export function filterPhrases(data: PhraseData, f: PhraseFilter): Phrase[] {
  const names = new Map(data.categories.map((c) => [c.id, c.name] as const));
  const tokens = norm(f.query).split(/\s+/).filter(Boolean);
  const tagKey = norm(f.tag);
  return data.phrases.filter((p) => {
    if (f.categoryId === UNCATEGORIZED) {
      if (p.categoryId !== null) return false;
    } else if (f.categoryId !== "" && p.categoryId !== f.categoryId) {
      return false;
    }
    if (tagKey !== "" && !p.tags.some((t) => norm(t) === tagKey)) return false;
    if (tokens.length === 0) return true;
    const hay = norm(
      [p.ja, p.en, p.categoryId ? (names.get(p.categoryId) ?? "") : "", ...p.tags].join("\n"),
    );
    return tokens.every((t) => hay.includes(t));
  });
}

export const allTags = (data: PhraseData): string[] =>
  normalizeTags(data.phrases.flatMap((p) => p.tags)).sort(collator.compare);
