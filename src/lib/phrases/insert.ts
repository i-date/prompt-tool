import type { Part, PromptSet } from "../../types";
import { norm } from "./text";

/** 語句の区切り（[A / B] 記法の記号も含む） */
const SPLIT = /[,，、。;；\n[\]\/|()（）]/;

/** 欄の中に同じ語句（区切り単位・表記ゆれは正規化）が既にあるか */
export function containsPhrase(text: string, phrase: string): boolean {
  const key = norm(phrase);
  if (key === "") return false;
  return text.split(SPLIT).some((t) => norm(t) === key);
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

/** 挿入先を決める。指定が無い・セットが削除済みなら最後のセットの「内容」 */
export function resolveTarget(sets: readonly PromptSet[], target: InsertTarget | null): ResolvedTarget | null {
  if (sets.length === 0) return null;
  if (target) {
    const i = sets.findIndex((s) => s.id === target.setId);
    if (i >= 0) return { ...target, index: i };
  }
  const i = sets.length - 1;
  return { setId: sets[i].id, part: "content", index: i };
}
