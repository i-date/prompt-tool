import { createEmptySet, DEFAULT_FORMAT } from "../doc";
import type { FormatMode, FormatOptions, Lang, Part, PromptDoc, PromptSet, Separator } from "../../types";

export class MarkdownFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkdownFormatError";
  }
}

const APP = "prompt-tool";
const VERSION = "1";
const SET_MARKER = "## Set";
const FIELD_KEYS = ["heading.ja", "heading.en", "content.ja", "content.en"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

const SEPARATORS: readonly Separator[] = ["newline", "comma"];
const FORMAT_MODES: readonly FormatMode[] = ["global", "perSet"];

const FIELD_RE = /^### ((?:heading|content)\.(?:ja|en))$/;
const MARKER_RE = /^(?:## Set|### (?:heading|content)\.(?:ja|en))$/;
const ESCAPED_RE = /^\\+(?:## Set|### (?:heading|content)\.(?:ja|en))$/;
const KV_RE = /^([a-z-]+):\s*(.*?)\s*$/;
const ATTR_RE = /^- ([a-z-]+):\s*(.*?)\s*$/;

/* ---------- 保存 ---------- */

/** 目印と同じ行（と、エスケープ済みの行）は先頭に「\」を付ける */
const escapeLine = (l: string) => (MARKER_RE.test(l) || ESCAPED_RE.test(l) ? `\\${l}` : l);
const bool = (b: boolean) => (b ? "true" : "false");
/** 欄の中身 + 区切りの空行1行 */
const body = (v: string) => `${v.split("\n").map(escapeLine).join("\n")}\n\n`;

export function serializeDoc(doc: PromptDoc): string {
  let s = `${[
    "---",
    `app: ${APP}`,
    `version: ${VERSION}`,
    `format-mode: ${doc.formatMode}`,
    `separator: ${doc.format.separator}`,
    `blank-after-heading: ${bool(doc.format.blankAfterHeading)}`,
    `blank-after-section: ${bool(doc.format.blankAfterSection)}`,
    "---",
    "",
  ].join("\n")}\n`;

  for (const set of doc.sets) {
    const attrs = [
      `- heading-output: ${bool(set.heading.output)}`,
      `- content-output: ${bool(set.content.output)}`,
    ];
    const f = set.format ?? {};
    if (f.separator !== undefined) attrs.push(`- separator: ${f.separator}`);
    if (f.blankAfterHeading !== undefined) attrs.push(`- blank-after-heading: ${bool(f.blankAfterHeading)}`);
    if (f.blankAfterSection !== undefined) attrs.push(`- blank-after-section: ${bool(f.blankAfterSection)}`);

    s += `${SET_MARKER}\n${attrs.join("\n")}\n\n`;
    for (const key of FIELD_KEYS) {
      const [part, lang] = key.split(".") as [Part, Lang];
      s += `### ${key}\n${body(set[part][lang])}`;
    }
  }
  return s;
}

/* ---------- 取り込み ---------- */

const unescapeLine = (l: string) => (ESCAPED_RE.test(l) ? l.slice(1) : l);

function oneOf<T extends string>(value: string, allowed: readonly T[], what: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new MarkdownFormatError(`${what} の値が不正です: ${value}`);
}
const toBool = (value: string, what: string) => oneOf(value, ["true", "false"], what) === "true";
const opt = <T>(v: string | undefined, fallback: T, parse: (v: string) => T) =>
  v === undefined ? fallback : parse(v);

function parseHeader(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  lines.forEach((line, i) => {
    if (line.trim() === "") return;
    const m = KV_RE.exec(line);
    if (!m) throw new MarkdownFormatError(`${i + 2}行目: ヘッダーの形式が不正です: ${line}`);
    map.set(m[1], m[2]);
  });
  return map;
}

function applyAttr(set: PromptSet, line: string, lineNo: number) {
  const m = ATTR_RE.exec(line);
  if (!m) throw new MarkdownFormatError(`${lineNo}行目: 不明な行です: ${line}`);
  const [, key, value] = m;
  const what = `${lineNo}行目の ${key}`;
  switch (key) {
    case "heading-output":
      set.heading.output = toBool(value, what);
      break;
    case "content-output":
      set.content.output = toBool(value, what);
      break;
    case "separator":
      set.format = { ...set.format, separator: oneOf(value, SEPARATORS, what) };
      break;
    case "blank-after-heading":
      set.format = { ...set.format, blankAfterHeading: toBool(value, what) };
      break;
    case "blank-after-section":
      set.format = { ...set.format, blankAfterSection: toBool(value, what) };
      break;
    default:
      break; // 将来の拡張に備え、知らないキーは無視する
  }
}

/** 欄の中身を確定する（区切りの空行1行を取り除く） */
function finishBody(buf: string[]): string {
  const t = buf.join("\n");
  return t.endsWith("\n") ? t.slice(0, -1) : t;
}

export function parseDoc(input: string): PromptDoc {
  const lines = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop(); // 末尾の改行分

  if (lines[0] !== "---") {
    throw new MarkdownFormatError("このツールで保存したファイルではありません（先頭に --- がありません）");
  }
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new MarkdownFormatError("ヘッダーの終わり（---）が見つかりません");

  const meta = parseHeader(lines.slice(1, end));
  if (meta.get("app") !== APP) {
    throw new MarkdownFormatError("このツールで保存したファイルではありません（app が一致しません）");
  }
  if (meta.get("version") !== VERSION) {
    throw new MarkdownFormatError(`未対応のバージョンです: ${meta.get("version") ?? "（なし）"}`);
  }

  const format: FormatOptions = {
    separator: opt(meta.get("separator"), DEFAULT_FORMAT.separator, (v) =>
      oneOf(v, SEPARATORS, "ヘッダーの separator"),
    ),
    blankAfterHeading: opt(meta.get("blank-after-heading"), DEFAULT_FORMAT.blankAfterHeading, (v) =>
      toBool(v, "ヘッダーの blank-after-heading"),
    ),
    blankAfterSection: opt(meta.get("blank-after-section"), DEFAULT_FORMAT.blankAfterSection, (v) =>
      toBool(v, "ヘッダーの blank-after-section"),
    ),
  };
  const formatMode = opt<FormatMode>(meta.get("format-mode"), "global", (v) =>
    oneOf(v, FORMAT_MODES, "ヘッダーの format-mode"),
  );

  const sets: PromptSet[] = [];
  let cur: PromptSet | null = null;
  let field: FieldKey | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (cur && field) {
      const [part, lang] = field.split(".") as [Part, Lang];
      cur[part][lang] = finishBody(buf);
    }
    field = null;
    buf = [];
  };

  for (let i = end + 1; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (line === SET_MARKER) {
      flush();
      cur = createEmptySet();
      sets.push(cur);
      continue;
    }
    const m = FIELD_RE.exec(line);
    if (m) {
      if (!cur) throw new MarkdownFormatError(`${lineNo}行目: ## Set より前に欄があります`);
      flush();
      field = m[1] as FieldKey;
      continue;
    }
    if (field) {
      buf.push(unescapeLine(line));
      continue;
    }
    if (line.trim() === "") continue;
    if (!cur) throw new MarkdownFormatError(`${lineNo}行目: ## Set より前に不明な行があります`);
    applyAttr(cur, line, lineNo);
  }
  flush();

  return { version: 1, formatMode, format, sets };
}
