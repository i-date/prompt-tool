export type Marker = "xml" | "html" | "brace";
export type TargetLang = "ja" | "en";
export type Piece = { kind: "text"; value: string } | { kind: "group"; options: string[] };
export type BatchTranslator = (texts: string[]) => Promise<string[]>;
export type TranslateOutcome = { texts: string[]; fallbackCount: number };

const GROUP_RE = /\[([^[\]]*\/[^[\]]*)\]/g;

/** `[A / B]`（角括弧内に / を含む）だけをグループとして分解。入れ子は非対応 */
export function splitSyntax(text: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(GROUP_RE)) {
    const at = m.index ?? 0;
    if (at > last) pieces.push({ kind: "text", value: text.slice(last, at) });
    pieces.push({ kind: "group", options: m[1].split("/").map((s) => s.trim()) });
    last = at + m[0].length;
  }
  if (last < text.length) pieces.push({ kind: "text", value: text.slice(last) });
  return pieces;
}

export const formatGroup = (options: string[]): string => `[${options.join(" / ")}]`;

export const joinSyntax = (pieces: Piece[]): string =>
  pieces.map((p) => (p.kind === "text" ? p.value : formatGroup(p.options))).join("");

type Codec = {
  enc: (s: string) => string;
  dec: (s: string) => string;
  placeholder: (i: number) => string;
  pattern: RegExp;
  conflicts: (literal: string) => boolean;
};

const escapeMarkup = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const NAMED: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&", nbsp: " " };
/** 文字参照を1回だけ展開（&amp;lt; を < にしてしまう二重展開をしない） */
export const decodeEntities = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k.startsWith("#")) {
      const cp = k[1] === "x" ? Number.parseInt(k.slice(2), 16) : Number.parseInt(k.slice(1), 10);
      return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return NAMED[k] ?? m;
  });

const CODECS: Record<Marker, Codec> = {
  // DeepL（tag_handling=xml）
  xml: {
    enc: escapeMarkup,
    dec: decodeEntities,
    placeholder: (i) => `<x i="${i}"/>`,
    pattern: /<x\s+i="(\d+)"\s*(?:\/>|><\/x>)/g,
    conflicts: () => false,
  },
  // Google（format=html）: notranslate で目印を保護、改行は <br> で往復
  html: {
    enc: (s) => escapeMarkup(s).replace(/\r?\n/g, "<br>"),
    dec: (s) => decodeEntities(s.replace(/ *<br\s*\/?> */gi, "\n")),
    placeholder: (i) => `<span class="notranslate">#${i}</span>`,
    pattern: /<span\s+class=["']?notranslate["']?\s*>\s*#\s*(\d+)\s*<\/span>/gi,
    conflicts: () => false,
  },
  // LLM（Ollama）
  brace: {
    enc: (s) => s,
    dec: (s) => s,
    placeholder: (i) => `{${i}}`,
    pattern: /\{(\d+)\}/g,
    conflicts: (s) => /\{\d+\}/.test(s),
  },
};

/** 翻訳後テンプレートを「文字列 / グループ番号」の列に分解。欠落・重複・範囲外は null */
export function parseTemplate(s: string, marker: Marker, groupCount: number): (string | number)[] | null {
  const codec = CODECS[marker];
  const out: (string | number)[] = [];
  const seen = new Set<number>();
  let last = 0;
  for (const m of s.matchAll(codec.pattern)) {
    const idx = Number(m[1]);
    const at = m.index ?? 0;
    if (idx >= groupCount || seen.has(idx)) return null;
    seen.add(idx);
    out.push(codec.dec(s.slice(last, at)), idx);
    last = at + m[0].length;
  }
  out.push(codec.dec(s.slice(last)));
  return seen.size === groupCount ? out : null;
}

type Token = { text: string; group: boolean };
const END_WORD = /[A-Za-z0-9,.;:!?)\]]$/;
const START_WORD = /^[A-Za-z0-9(\[]/;

/** 英語出力時、グループと単語が密着していれば半角空白を補う */
export function joinTokens(tokens: Token[], spaced: boolean): string {
  let out = "";
  let prevGroup = false;
  for (const t of tokens) {
    if (t.text === "") continue;
    if (spaced && (t.group || prevGroup) && END_WORD.test(out) && START_WORD.test(t.text)) out += " ";
    out += t.text;
    prevGroup = t.group;
  }
  return out;
}

class Batch {
  readonly items: string[] = [];
  private readonly index = new Map<string, number>();
  add(s: string): number {
    let i = this.index.get(s);
    if (i === undefined) {
      i = this.items.length;
      this.items.push(s);
      this.index.set(s, i);
    }
    return i;
  }
}

async function runBatch(fn: BatchTranslator, items: string[]): Promise<string[]> {
  if (items.length === 0) return [];
  const out = await fn(items);
  if (out.length !== items.length) {
    throw new Error(`翻訳結果の件数が一致しません（送信 ${items.length} / 受信 ${out.length}）`);
  }
  return out;
}

type SyntaxJob = {
  kind: "syntax";
  lead: string;
  trail: string;
  pieces: Piece[];
  optionRefs: (number | null)[][];
  templateRef: number | null;
  hasLiteral: boolean;
};
type Job = { kind: "keep"; value: string } | { kind: "plain"; lead: string; trail: string; ref: number } | SyntaxJob;

/**
 * [A / B] 構文を保ったまま複数テキストを翻訳する。
 * 1回目: 目印入りテンプレート + 各選択肢をまとめて翻訳（重複は1回だけ送信）
 * 2回目: 目印が崩れたテキストだけ、構文以外の部分を個別に翻訳して組み立てる
 */
export async function translatePreservingSyntax(
  inputs: string[],
  marker: Marker,
  target: TargetLang,
  fn: BatchTranslator,
): Promise<TranslateOutcome> {
  const codec = CODECS[marker];
  const spaced = target === "en";
  const first = new Batch();

  const jobs = inputs.map((raw): Job => {
    const core = raw.trim();
    if (core === "") return { kind: "keep", value: raw };
    const lead = raw.slice(0, raw.length - raw.trimStart().length);
    const trail = raw.slice(raw.trimEnd().length);
    const pieces = splitSyntax(core);
    const groups = pieces.flatMap((p) => (p.kind === "group" ? [p.options] : []));
    if (groups.length === 0) return { kind: "plain", lead, trail, ref: first.add(codec.enc(core)) };
    const optionRefs = groups.map((opts) => opts.map((o) => (o === "" ? null : first.add(codec.enc(o)))));
    const literals = pieces.flatMap((p) => (p.kind === "text" ? [p.value] : []));
    const hasLiteral = literals.some((v) => v.trim() !== "");
    let templateRef: number | null = null;
    if (hasLiteral && !literals.some((v) => codec.conflicts(v))) {
      let k = 0;
      templateRef = first.add(pieces.map((p) => (p.kind === "text" ? codec.enc(p.value) : codec.placeholder(k++))).join(""));
    }
    return { kind: "syntax", lead, trail, pieces, optionRefs, templateRef, hasLiteral };
  });

  const r1 = await runBatch(fn, first.items);
  const res1 = (ref: number): string => codec.dec(r1[ref]).trim();

  const results: string[] = new Array(inputs.length).fill("");
  const fallback: { index: number; job: SyntaxJob; groups: string[] }[] = [];

  jobs.forEach((job, i) => {
    if (job.kind === "keep") {
      results[i] = job.value;
      return;
    }
    if (job.kind === "plain") {
      results[i] = job.lead + res1(job.ref) + job.trail;
      return;
    }
    const groups = job.optionRefs.map((refs) => formatGroup(refs.map((r) => (r === null ? "" : res1(r)))));
    if (!job.hasLiteral) {
      let k = 0;
      const tokens = job.pieces.map((p): Token =>
        p.kind === "text" ? { text: p.value, group: false } : { text: groups[k++], group: true },
      );
      results[i] = job.lead + joinTokens(tokens, spaced) + job.trail;
      return;
    }
    const parsed = job.templateRef === null ? null : parseTemplate(r1[job.templateRef], marker, groups.length);
    if (parsed) {
      const tokens = parsed.map((t): Token =>
        typeof t === "number" ? { text: groups[t], group: true } : { text: t, group: false },
      );
      results[i] = job.lead + joinTokens(tokens, spaced).trim() + job.trail;
      return;
    }
    fallback.push({ index: i, job, groups });
  });

  if (fallback.length > 0) {
    const second = new Batch();
    const refs = fallback.map(({ job }) =>
      job.pieces.map((p) => (p.kind === "text" && p.value.trim() !== "" ? second.add(codec.enc(p.value.trim())) : null)),
    );
    const r2 = await runBatch(fn, second.items);
    fallback.forEach(({ index, job, groups }, n) => {
      let k = 0;
      const tokens = job.pieces.map((p, pi): Token => {
        if (p.kind === "group") return { text: groups[k++], group: true };
        const ref = refs[n][pi];
        return { text: ref === null ? p.value : codec.dec(r2[ref]).trim(), group: false };
      });
      results[index] = job.lead + joinTokens(tokens, spaced).trim() + job.trail;
    });
  }

  return { texts: results, fallbackCount: fallback.length };
}
