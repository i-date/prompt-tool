import { applyPicks } from "../random-syntax";
import type { FormatOptions, Lang, Picks, PromptDoc, PromptSet } from "../../types";

export type BuildOptions = { trimContent: boolean };

type Block = { heading: string; content: string; fmt: FormatOptions };

/** セットに適用する書式を決める（global モードでは個別指定を無視） */
export function resolveFormat(doc: PromptDoc, set: PromptSet): FormatOptions {
  const g = doc.format;
  const o = set.format;
  if (doc.formatMode === "global" || !o) return g;
  return {
    separator: o.separator ?? g.separator,
    blankAfterHeading: o.blankAfterHeading ?? g.blankAfterHeading,
    blankAfterSection: o.blankAfterSection ?? g.blankAfterSection,
  };
}

/** セット間の区切り（優先順位：セクション後の空行 > 強制改行 > 区切り設定） */
function joiner(prev: Block, next: Block): string {
  if (prev.fmt.blankAfterSection) return "\n\n";
  if (next.heading !== "" || prev.content === "") return "\n"; // 見出しは常に単独行
  return prev.fmt.separator === "comma" ? ", " : "\n";
}

function renderBlock(b: Block): string {
  if (b.heading && b.content) {
    return b.heading + (b.fmt.blankAfterHeading ? "\n\n" : "\n") + b.content;
  }
  return b.heading || b.content;
}

export function buildPrompt(
  doc: PromptDoc,
  picks: Picks,
  lang: Lang,
  opts: BuildOptions = { trimContent: true },
): string {
  const blocks: Block[] = [];

  for (const set of doc.sets) {
    const heading = set.heading.output ? set.heading[lang].trim() : "";
    const raw = set.content.output
      ? applyPicks(set.content[lang], picks[set.id]?.[lang] ?? [])
      : "";
    // 空白だけの内容は、トリム設定に関係なく空として扱う
    const content = raw.trim() === "" ? "" : opts.trimContent ? raw.trim() : raw;
    if (!heading && !content) continue;
    blocks.push({ heading, content, fmt: resolveFormat(doc, set) });
  }

  return blocks
    .map((b, i) => (i === 0 ? "" : joiner(blocks[i - 1], b)) + renderBlock(b))
    .join("");
}
