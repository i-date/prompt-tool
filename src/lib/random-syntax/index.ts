import type { SetPicks } from "../../types";

export type Rng = () => number;
export type RandomGroup = { start: number; end: number; options: string[] };
type Pair = { ja: string; en: string };

const GROUP_RE = /\[([^[\]]*)\]/g;

/** 「/」を含む [..] だけをランダム選択グループとして抽出（入れ子は非対応） */
export function parseGroups(text: string): RandomGroup[] {
  const groups: RandomGroup[] = [];
  for (const m of text.matchAll(GROUP_RE)) {
    const inner = m[1];
    if (!inner.includes("/")) continue; // [from:to:step] 等はそのまま出力
    const start = m.index ?? 0;
    groups.push({
      start,
      end: start + m[0].length,
      options: inner.split("/").map((s) => s.trim()),
    });
  }
  return groups;
}

/** 抽選結果を適用して文字列を確定する（未抽選のグループは先頭の選択肢） */
export function applyPicks(text: string, picks: number[]): string {
  let out = "";
  let cursor = 0;
  parseGroups(text).forEach((g, i) => {
    out += text.slice(cursor, g.start);
    out += g.options[picks[i] ?? 0] ?? g.options[0];
    cursor = g.end;
  });
  return out + text.slice(cursor);
}

const pickIndex = (n: number, rng: Rng) => Math.min(n - 1, Math.floor(rng() * n));

/** 同じ位置・同じ選択肢数のグループは、英語の抽選結果を日本語に合わせる */
function syncEnToJa(ja: string, en: string, picks: SetPicks): SetPicks {
  const gj = parseGroups(ja);
  const ge = parseGroups(en);
  return {
    ja: picks.ja,
    en: picks.en.map((v, i) =>
      gj[i] !== undefined && gj[i].options.length === ge[i]?.options.length ? picks.ja[i] : v,
    ),
  };
}

/** セット全体を新しく抽選する（再抽選ボタン・取り込み時） */
export function drawPicks(ja: string, en: string, rng: Rng = Math.random): SetPicks {
  const draw = (t: string) => parseGroups(t).map((g) => pickIndex(g.options.length, rng));
  return syncEnToJa(ja, en, { ja: draw(ja), en: draw(en) });
}

/** 編集時：選択肢数が変わったグループだけ抽選し直し、それ以外は結果を保持する */
export function reconcilePicks(
  prev: Pair,
  next: Pair,
  prevPicks: SetPicks | undefined,
  rng: Rng = Math.random,
): SetPicks {
  const fresh = drawPicks(next.ja, next.en, rng);
  if (!prevPicks) return fresh;

  const keep = (lang: "ja" | "en") => {
    const before = parseGroups(prev[lang]);
    return parseGroups(next[lang]).map((g, i) => {
      const old = prevPicks[lang][i];
      return before[i]?.options.length === g.options.length && old !== undefined
        ? old
        : fresh[lang][i];
    });
  };
  return syncEnToJa(next.ja, next.en, { ja: keep("ja"), en: keep("en") });
}
