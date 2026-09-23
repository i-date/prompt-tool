import { parseCsvText, toCsvText } from "./csv";
import { parsePhraseData } from "./schema";
import { norm, normalizeTags, phraseKey } from "./text";
import { type Category, type Phrase, type PhraseData, emptyPhraseData, newId } from "./types";

export type ImportMode = "merge" | "replace";
export type ImportPhrase = {
  ja: string;
  en: string;
  categoryName: string | null;
  tags: string[];
  candidate: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type ImportPayload = { categories: { name: string; candidate: boolean }[]; phrases: ImportPhrase[] };
export type ImportResult = { data: PhraseData; added: number; skipped: number; categoriesAdded: number };

const CSV_HEADER = ["ja", "en", "category", "tags", "candidate"];
const ALIASES: Record<string, string> = {
  ja: "ja", 日本語: "ja", en: "en", 英語: "en",
  category: "category", カテゴリ: "category", tags: "tags", タグ: "tags",
  candidate: "candidate", 候補: "candidate", 候補対象: "candidate",
};
const FALSY = new Set(["0", "false", "no", "off", "対象外", "×", "x"]);

export function phrasesToCsv(data: PhraseData): string {
  const names = new Map(data.categories.map((c) => [c.id, c.name] as const));
  return toCsvText([
    CSV_HEADER,
    ...data.phrases.map((p) => [
      p.ja,
      p.en,
      p.categoryId ? (names.get(p.categoryId) ?? "") : "",
      p.tags.join(";"),
      p.candidate ? "1" : "0",
    ]),
  ]);
}

export function csvToPayload(text: string): ImportPayload {
  const rows = parseCsvText(text);
  if (rows.length === 0) throw new Error("CSV が空です");
  const idx: Record<string, number> = {};
  rows[0].forEach((h, i) => {
    const k = ALIASES[norm(h)];
    if (k && idx[k] === undefined) idx[k] = i;
  });
  if (idx.ja === undefined || idx.en === undefined) {
    throw new Error("1行目に ja と en（または 日本語・英語）の見出しが必要です");
  }
  const cell = (r: string[], k: string): string => (idx[k] === undefined ? "" : (r[idx[k]] ?? ""));
  const phrases: ImportPhrase[] = rows
    .slice(1)
    .map((r) => ({
      ja: cell(r, "ja").trim(),
      en: cell(r, "en").trim(),
      categoryName: cell(r, "category").trim() || null,
      tags: normalizeTags(cell(r, "tags").split(/[;；]/)),
      candidate: !FALSY.has(norm(cell(r, "candidate"))),
    }))
    .filter((p) => p.ja !== "" || p.en !== "");
  const names = normalizeTags(phrases.flatMap((p) => (p.categoryName ? [p.categoryName] : [])));
  return { categories: names.map((name) => ({ name, candidate: true })), phrases };
}

export function jsonToPayload(text: string): ImportPayload {
  const d = parsePhraseData(text);
  const names = new Map(d.categories.map((c) => [c.id, c.name] as const));
  return {
    categories: d.categories.map(({ name, candidate }) => ({ name, candidate })),
    phrases: d.phrases.map((p) => ({
      ja: p.ja,
      en: p.en,
      categoryName: p.categoryId ? (names.get(p.categoryId) ?? null) : null,
      tags: p.tags,
      candidate: p.candidate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
}

/** merge: 既存に追加（重複スキップ・同名カテゴリは再利用し既存フラグ維持）/ replace: 全置換 */
export function applyImport(current: PhraseData, payload: ImportPayload, mode: ImportMode): ImportResult {
  const base = mode === "replace" ? emptyPhraseData() : current;
  const categories: Category[] = [...base.categories];
  const phrases: Phrase[] = [...base.phrases];
  const byName = new Map(categories.map((c) => [norm(c.name), c.id] as const));
  const now = new Date().toISOString();
  let categoriesAdded = 0;
  const ensureCategory = (name: string, candidate = true): string => {
    const k = norm(name);
    let id = byName.get(k);
    if (!id) {
      id = newId();
      categories.push({ id, name: name.trim(), candidate });
      byName.set(k, id);
      categoriesAdded++;
    }
    return id;
  };
  for (const c of payload.categories) ensureCategory(c.name, c.candidate);
  const keys = new Set(phrases.map((p) => phraseKey(p.ja, p.en)));
  let added = 0;
  let skipped = 0;
  for (const p of payload.phrases) {
    const k = phraseKey(p.ja, p.en);
    if (keys.has(k)) {
      skipped++;
      continue;
    }
    keys.add(k);
    phrases.push({
      id: newId(),
      ja: p.ja,
      en: p.en,
      categoryId: p.categoryName ? ensureCategory(p.categoryName) : null,
      tags: normalizeTags(p.tags),
      candidate: p.candidate,
      createdAt: p.createdAt ?? now,
      updatedAt: p.updatedAt ?? now,
    });
    added++;
  }
  return { data: { version: 1, categories, phrases }, added, skipped, categoriesAdded };
}
