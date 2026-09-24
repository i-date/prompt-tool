import { norm } from "./text";
import { isEffectiveCandidate, type PhraseData } from "./types";

export type SuggestLang = "ja" | "en";
/** 検索用に正規化済みの候補 */
export type PoolEntry = {
  id: string;
  ja: string;
  en: string;
  nja: string;
  nen: string;
  category: string | null;
};
export type SuggestItem = { id: string; insert: string; other: string; category: string | null };
export type SuggestResult = { start: number; end: number; items: SuggestItem[] };

/** 語句の区切り（[A / B] 記法の記号も含む） */
const DELIM = /[,，、。;；\n[\]\/|()（）]/;
const MAX_QUERY = 30;
const DEFAULT_LIMIT = 8;
const isAscii = (s: string): boolean => /^[\x20-\x7e]*$/.test(s);
const isSpace = (s: string): boolean => /\s/.test(s);

/** 候補の対象（フレーズ・カテゴリとも ON）だけを検索用に整える */
export function buildPool(data: PhraseData): PoolEntry[] {
  const names = new Map(data.categories.map((c) => [c.id, c.name] as const));
  return data.phrases
    .filter((p) => isEffectiveCandidate(p, data.categories))
    .map((p) => ({
      id: p.id,
      ja: p.ja,
      en: p.en,
      nja: norm(p.ja),
      nen: norm(p.en),
      category: p.categoryId ? (names.get(p.categoryId) ?? null) : null,
    }));
}

/** カーソル位置で入力中の語句の範囲（直前の区切り〜カーソル、先頭の空白は除く） */
export function tokenAt(value: string, caret: number): { start: number; end: number } | null {
  let s = caret;
  while (s > 0 && !DELIM.test(value[s - 1])) s--;
  while (s < caret && isSpace(value[s])) s++;
  return s < caret ? { start: s, end: caret } : null;
}

/** 検索に使う開始位置（長い順）。英語は単語の頭、日本語は各文字から */
function queryStarts(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text.length - i > MAX_QUERY || isSpace(text[i])) continue;
    if (i === 0 || isSpace(text[i - 1]) || !isAscii(text[i]) || !isAscii(text[i - 1])) out.push(i);
  }
  return out;
}

/**
 * 入力中の語句に合う候補を探す。
 * 語句の先頭から順に短くしながら探し、最初に候補が見つかった範囲を置き換え対象にする。
 */
export function findSuggestions(
  pool: readonly PoolEntry[],
  value: string,
  caret: number,
  lang: SuggestLang,
  limit = DEFAULT_LIMIT,
): SuggestResult | null {
  const token = tokenAt(value, caret);
  if (!token || pool.length === 0) return null;
  const text = value.slice(token.start, token.end);

  for (const [n, offset] of queryStarts(text).entries()) {
    const q = norm(text.slice(offset));
    if (q === "") continue;
    if (isAscii(q) ? q.length < 2 : n > 0 && q.length < 2) continue; // 途中からの 1 文字は雑音が多い
    const whole = n === 0; // 語句全体のときだけ部分一致も許す

    const scored: { e: PoolEntry; score: number }[] = [];
    for (const e of pool) {
      const insert = lang === "ja" ? e.ja : e.en;
      if (insert.trim() === "") continue;
      const tgt = lang === "ja" ? e.nja : e.nen;
      const oth = lang === "ja" ? e.nen : e.nja;
      if (tgt === q) continue; // 入力済みと同じものは出さない
      const score = tgt.startsWith(q)
        ? 0
        : oth.startsWith(q)
          ? 1
          : whole && tgt.includes(q)
            ? 2
            : whole && oth.includes(q)
              ? 3
              : -1;
      if (score >= 0) scored.push({ e, score });
    }
    if (scored.length === 0) continue;

    scored.sort((a, b) => a.score - b.score); // 同点は登録順（安定ソート）
    const seen = new Set<string>();
    const items: SuggestItem[] = [];
    for (const { e } of scored) {
      const insert = lang === "ja" ? e.ja : e.en;
      const key = norm(insert);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ id: e.id, insert, other: lang === "ja" ? e.en : e.ja, category: e.category });
      if (items.length >= limit) break;
    }
    return { start: token.start + offset, end: token.end, items };
  }
  return null;
}

/** 範囲を候補で置き換え、挿入後のカーソル位置を返す */
export function applySuggestion(
  value: string,
  start: number,
  end: number,
  insert: string,
): { value: string; caret: number } {
  return { value: value.slice(0, start) + insert + value.slice(end), caret: start + insert.length };
}
