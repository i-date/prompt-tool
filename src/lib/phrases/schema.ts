import { normalizeTags } from "./text";
import { type Category, type Phrase, type PhraseData, newId } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

export function parsePhraseData(text: string): PhraseData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("JSON として読み取れません");
  }
  if (!isObj(raw) || !Array.isArray(raw.phrases)) {
    throw new Error("フレーズデータの形式ではありません（phrases がありません）");
  }
  const used = new Set<string>();
  const uid = (v: unknown): string => {
    let id = str(v);
    if (id === "" || used.has(id)) id = newId();
    used.add(id);
    return id;
  };
  const categories: Category[] = (Array.isArray(raw.categories) ? raw.categories : [])
    .filter(isObj)
    .map((c) => ({ id: uid(c.id), name: str(c.name).trim(), candidate: c.candidate !== false }))
    .filter((c) => c.name !== "");
  const catIds = new Set(categories.map((c) => c.id));
  const now = new Date().toISOString();
  const phrases: Phrase[] = raw.phrases
    .filter(isObj)
    .map((p) => {
      const cid = str(p.categoryId);
      const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string") : [];
      return {
        id: uid(p.id),
        ja: str(p.ja),
        en: str(p.en),
        categoryId: catIds.has(cid) ? cid : null,
        tags: normalizeTags(tags),
        candidate: p.candidate !== false,
        createdAt: str(p.createdAt, now),
        updatedAt: str(p.updatedAt, now),
      };
    })
    .filter((p) => p.ja.trim() !== "" || p.en.trim() !== "");
  return { version: 1, categories, phrases };
}

export const serializePhraseData = (d: PhraseData): string => `${JSON.stringify(d, null, 2)}\n`;
