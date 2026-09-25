import type { SetPicks } from "../../types";

export type Rng = () => number;
/** 選択肢 1 つぶん。text は出力する文字列（!相手 を除き、\! を ! に戻したもの） */
export type ParsedOption = { text: string; excludes: string[]; invalid: boolean };
export type RandomGroup = { start: number; end: number; options: string[]; parsed: ParsedOption[] };
/** 除外ルール：[グループ, 選択肢, 相手のグループ, 相手の選択肢] の組み合わせは出さない */
export type Rule = readonly [number, number, number, number];
type Pair = { ja: string; en: string };
type LangInfo = { groups: RandomGroup[]; rules: Rule[]; warnings: string[] };
type SetInfo = { ja: LangInfo; en: LangInfo; linked: boolean; merged: Rule[] };

const GROUP_RE = /\[([^[\]]*)\]/g;
/** 許可された組み合わせを総当たりで数える上限（超えたら試行で探す） */
const ENUM_LIMIT = 20000;
const RETRY_LIMIT = 500;
const ALL_EXCLUDED = "すべての組み合わせが除外されているため、除外を無視して抽選します";

/* ---------- 記法の読み取り ---------- */

export const unescapeBang = (s: string): string => s.replace(/\\!/g, "!");
/** 文字の ! を \! にする（既に \! のものはそのまま） */
export const escapeBang = (s: string): string => s.replace(/\\?!/g, "\\!");

/** エスケープされていない ! で分ける（\! は分けずに残す） */
function splitBang(raw: string): string[] {
  const segs: string[] = [];
  let cur = "";
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "\\" && raw[i + 1] === "!") {
      cur += "\\!";
      i++;
    } else if (raw[i] === "!") {
      segs.push(cur);
      cur = "";
    } else {
      cur += raw[i];
    }
  }
  segs.push(cur);
  return segs;
}

/** 「選択肢!相手!相手…」を読む。a! / !a / !! は書き間違いとして全体を文字で出す */
export function parseOption(raw: string): ParsedOption {
  const segs = splitBang(raw);
  const literal = unescapeBang(raw).trim();
  if (segs.length === 1) return { text: literal, excludes: [], invalid: false };
  const parts = segs.map((s) => unescapeBang(s).trim());
  if (parts.some((p) => p === "")) return { text: literal, excludes: [], invalid: true };
  return { text: parts[0], excludes: parts.slice(1), invalid: false };
}

/** 「/」を含む [..] だけをランダム選択グループとして抽出（入れ子は非対応） */
export function parseGroups(text: string): RandomGroup[] {
  const groups: RandomGroup[] = [];
  for (const m of text.matchAll(GROUP_RE)) {
    const inner = m[1];
    if (!inner.includes("/")) continue; // [from:to:step] 等はそのまま出力
    const start = m.index ?? 0;
    const parsed = inner.split("/").map(parseOption);
    groups.push({ start, end: start + m[0].length, options: parsed.map((o) => o.text), parsed });
  }
  return groups;
}

/** 除外の相手を同じ欄のほかのグループから探してルールにする */
function compile(text: string): LangInfo {
  const groups = parseGroups(text);
  const rules: Rule[] = [];
  const warnings: string[] = [];
  groups.forEach((g, gi) =>
    g.parsed.forEach((o, oi) => {
      if (o.invalid) {
        warnings.push(`「${o.text}」の ! は文字として出力します（除外は「選択肢!相手」、文字の ! は「\\!」）`);
      }
      for (const ref of o.excludes) {
        let found = false;
        groups.forEach((h, hj) => {
          if (hj === gi) return; // 同じグループ内は対象外
          h.options.forEach((t, tj) => {
            if (t === ref) {
              rules.push([gi, oi, hj, tj]);
              found = true;
            }
          });
        });
        if (!found) warnings.push(`除外の相手「${ref}」が見つかりません（「${o.text}!${ref}」）`);
      }
    }),
  );
  return { groups, rules, warnings };
}

/** 日英でグループ数・各選択肢数が同じなら、除外を位置でまとめて両方に効かせる */
function analyze(ja: string, en: string): SetInfo {
  const a = compile(ja);
  const b = compile(en);
  const linked =
    a.groups.length > 0 &&
    a.groups.length === b.groups.length &&
    a.groups.every((g, i) => g.options.length === b.groups[i].options.length);
  return { ja: a, en: b, linked, merged: linked ? [...a.rules, ...b.rules] : [] };
}

/* ---------- 抽選 ---------- */

const pickIndex = (n: number, rng: Rng) => Math.min(n - 1, Math.floor(rng() * n));

const violates = (picks: readonly number[], rules: readonly Rule[]): boolean =>
  rules.some(([g, o, h, t]) => picks[g] === o && picks[h] === t);

const involvedOf = (rules: readonly Rule[]): number[] =>
  [...new Set(rules.flatMap(([g, , h]) => [g, h]))].sort((x, y) => x - y);

/** 除外に関わるグループの、許可された組み合わせ一覧（多すぎるときは null） */
function allowedCombos(sizes: readonly number[], involved: readonly number[], rules: readonly Rule[]): number[][] | null {
  const total = involved.reduce((p, g) => p * sizes[g], 1);
  if (total > ENUM_LIMIT) return null;
  const out: number[][] = [];
  const cur = involved.map(() => 0);
  const full = sizes.map(() => 0);
  for (let n = 0; n < total; n++) {
    involved.forEach((g, k) => {
      full[g] = cur[k];
    });
    if (!violates(full, rules)) out.push([...cur]);
    for (let k = cur.length - 1; k >= 0; k--) {
      cur[k]++;
      if (cur[k] < sizes[involved[k]]) break;
      cur[k] = 0;
    }
  }
  return out;
}

/** 許可された組み合わせから均等に抽選する。ok=false はすべて除外されていた（除外を無視した） */
function drawWithRules(groups: readonly RandomGroup[], rules: readonly Rule[], rng: Rng): { picks: number[]; ok: boolean } {
  const sizes = groups.map((g) => g.options.length);
  const involved = involvedOf(rules);
  const inv = new Set(involved);
  const picks = sizes.map((n, i) => (inv.has(i) ? 0 : pickIndex(n, rng))); // 除外と無関係なグループは独立に抽選
  if (involved.length === 0) return { picks, ok: true };

  const drawInvolved = () => {
    for (const g of involved) picks[g] = pickIndex(sizes[g], rng);
  };
  const allowed = allowedCombos(sizes, involved, rules);
  if (allowed) {
    if (allowed.length === 0) {
      drawInvolved();
      return { picks, ok: false };
    }
    const c = allowed[pickIndex(allowed.length, rng)];
    involved.forEach((g, k) => {
      picks[g] = c[k];
    });
    return { picks, ok: true };
  }
  for (let t = 0; t < RETRY_LIMIT; t++) {
    drawInvolved();
    if (!violates(picks, rules)) return { picks, ok: true };
  }
  return { picks, ok: false };
}

/** 英語の抽選結果を日本語に合わせる（連動時は全部、そうでなければ同じ位置・同じ選択肢数で英語側の除外に関わらないもの） */
function sync(info: SetInfo, p: SetPicks): SetPicks {
  if (info.linked) return { ja: p.ja, en: [...p.ja] };
  const gj = info.ja.groups;
  const ge = info.en.groups;
  const enInv = new Set(involvedOf(info.en.rules));
  return {
    ja: p.ja,
    en: p.en.map((v, i) =>
      gj[i] !== undefined && gj[i].options.length === ge[i]?.options.length && !enInv.has(i) ? p.ja[i] : v,
    ),
  };
}

const isValid = (info: SetInfo, p: SetPicks): boolean =>
  info.linked ? !violates(p.ja, info.merged) : !violates(p.ja, info.ja.rules) && !violates(p.en, info.en.rules);

function drawSet(info: SetInfo, rng: Rng): { picks: SetPicks; ok: boolean } {
  if (info.linked) {
    const r = drawWithRules(info.ja.groups, info.merged, rng);
    return { picks: { ja: r.picks, en: [...r.picks] }, ok: r.ok };
  }
  const a = drawWithRules(info.ja.groups, info.ja.rules, rng);
  const b = drawWithRules(info.en.groups, info.en.rules, rng);
  return { picks: sync(info, { ja: a.picks, en: b.picks }), ok: a.ok && b.ok };
}

/** セット全体を新しく抽選する（再抽選ボタン・取り込み時） */
export function drawPicks(ja: string, en: string, rng: Rng = Math.random): SetPicks {
  return drawSet(analyze(ja, en), rng).picks;
}

/**
 * 編集時：選択肢数が変わったグループだけ抽選し直し、それ以外は結果を保持する。
 * 保持した結果が除外に当たるようになったら、そのセットを抽選し直す
 */
export function reconcilePicks(
  prev: Pair,
  next: Pair,
  prevPicks: SetPicks | undefined,
  rng: Rng = Math.random,
): SetPicks {
  const info = analyze(next.ja, next.en);
  const fresh = drawSet(info, rng);
  if (!prevPicks) return fresh.picks;

  const keep = (lang: "ja" | "en") => {
    const before = parseGroups(prev[lang]);
    return info[lang].groups.map((g, i) => {
      const old = prevPicks[lang][i];
      return before[i]?.options.length === g.options.length && old !== undefined ? old : fresh.picks[lang][i];
    });
  };
  const kept = sync(info, { ja: keep("ja"), en: keep("en") });
  // すべて除外されている間は、入力のたびに結果が変わらないよう保持を優先
  return !isValid(info, kept) && fresh.ok ? fresh.picks : kept;
}

/* ---------- 出力・警告 ---------- */

/** 抽選結果を適用して文字列を確定する（未抽選のグループは先頭の選択肢。!相手 は出力しない） */
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

/** セットの ⚠ に出す注意（書き間違い・相手が見つからない・すべて除外） */
export function exclusionWarnings(ja: string, en: string): string[] {
  const info = analyze(ja, en);
  const w = [...info.ja.warnings.map((s) => `日本語：${s}`), ...info.en.warnings.map((s) => `English：${s}`)];
  const none = (groups: readonly RandomGroup[], rules: readonly Rule[]) => {
    if (rules.length === 0) return false;
    const a = allowedCombos(groups.map((g) => g.options.length), involvedOf(rules), rules);
    return a !== null && a.length === 0;
  };
  if (info.linked) {
    if (none(info.ja.groups, info.merged)) w.push(ALL_EXCLUDED);
  } else {
    if (none(info.ja.groups, info.ja.rules)) w.push(`日本語：${ALL_EXCLUDED}`);
    if (none(info.en.groups, info.en.rules)) w.push(`English：${ALL_EXCLUDED}`);
  }
  return w;
}
