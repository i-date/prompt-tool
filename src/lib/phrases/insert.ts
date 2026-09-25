import type { Part, PromptSet } from "../../types";
import { norm } from "./text";
import { parseGroups } from "../random-syntax";

/** 語句の区切り（[A / B] 記法の記号も含む） */
const SPLIT = /[,，、。;；\n[\]\/|()（）]/;

/** ランダムグループ内の ! を区切りに、\! を ! に置き換えた文字列 */
function bangAsDelimiter(text: string): string {
  let out = "";
  let cur = 0;
  for (const g of parseGroups(text)) {
    out += text.slice(cur, g.start) + text.slice(g.start, g.end).replace(/\\?!/g, (m) => (m === "!" ? "," : "!"));
    cur = g.end;
  }
  return out + text.slice(cur);
}

/** 欄の中に同じ語句（区切り単位・表記ゆれは正規化）が既にあるか。「選択肢!相手」も分けて見る */
export function containsPhrase(text: string, phrase: string): boolean {
  const key = norm(phrase);
  if (key === "") return false;
  const has = (t: string) => t.split(SPLIT).some((x) => norm(x) === key);
  return has(text) || has(bangAsDelimiter(text));
}

/** 欄の末尾に語句を追加する（既にあれば変更しない） */
export function appendPhrase(current: string, phrase: string): { value: string; changed: boolean } {
  const add = phrase.trim();
  if (add === "" || containsPhrase(current, add)) return { value: current, changed: false };
  if (current.trim() === "") return { value: add, changed: true };
  if (/\n[^\S\n]*$/.test(current)) {
    return { value: current.replace(/[^\S\n]+$/, "") + add, changed: true }; // 改行の後ろ＝次の行に入れる
  }
  const base = current.replace(/\s+$/, "");
  const joiner = /[、，]$/.test(base) ? "" : /,$/.test(base) ? " " : ", ";
  return { value: base + joiner + add, changed: true };
}

export type InsertTarget = { setId: string; part: Part };
export type ResolvedTarget = InsertTarget & { index: number };

/**
 * 挿入先を決める。指定が無い・セットが削除済みなら最後のセットの「内容」。
 * allowHeading が false（見出し非表示）のとき、見出しの指定は同じセットの「内容」に読み替える
 */
export function resolveTarget(
  sets: readonly PromptSet[],
  target: InsertTarget | null,
  { allowHeading = true }: { allowHeading?: boolean } = {},
): ResolvedTarget | null {
  if (sets.length === 0) return null;
  if (target) {
    const i = sets.findIndex((s) => s.id === target.setId);
    if (i >= 0) return { setId: target.setId, part: allowHeading ? target.part : "content", index: i };
  }
  const i = sets.length - 1;
  return { setId: sets[i].id, part: "content", index: i };
}
