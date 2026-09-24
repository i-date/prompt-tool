import { describe, expect, it } from "vitest";
import { applySuggestion, buildPool, findSuggestions, tokenAt } from "./suggest";
import { cat, ph } from "./testUtils";
import type { PhraseData } from "./types";

const data = (phrases = [
  ph("1", "金髪", "blonde hair"),
  ph("2", "青い目", "blue eyes"),
  ph("3", "金髪ロング", "long blonde hair"),
]): PhraseData => ({ version: 1, categories: [], phrases });

const at = (value: string, lang: "ja" | "en", d = data()) =>
  findSuggestions(buildPool(d), value, value.length, lang);

describe("tokenAt", () => {
  it("直前の区切りからカーソルまで（先頭の空白は除く）", () => {
    expect(tokenAt("1girl, blo", 10)).toEqual({ start: 7, end: 10 });
    expect(tokenAt("[red / bl", 9)).toEqual({ start: 7, end: 9 });
    expect(tokenAt("a\nbc", 4)).toEqual({ start: 2, end: 4 });
    expect(tokenAt("a, ", 3)).toBeNull();
  });
});

describe("findSuggestions", () => {
  it("前方一致の候補を返し、置き換え範囲は入力中の語句", () => {
    const r = at("1girl, bl", "en");
    expect(r?.start).toBe(7);
    expect(r?.items.map((i) => i.insert)).toEqual(["blonde hair", "blue eyes", "long blonde hair"]);
  });
  it("前方一致を部分一致より先に並べる", () => {
    expect(at("blonde", "en")?.items.map((i) => i.insert)).toEqual(["blonde hair", "long blonde hair"]);
  });
  it("英語欄で日本語を入力すると対応する英語を挿入候補にする", () => {
    const r = at("金", "en");
    expect(r?.start).toBe(0);
    expect(r?.items[0]).toMatchObject({ insert: "blonde hair", other: "金髪" });
  });
  it("区切りのない日本語文でも末尾の語句で探す", () => {
    const r = at("教室の窓際に立つ金髪", "ja", data([ph("1", "金髪ロング", "long blonde hair")]));
    expect(r?.start).toBe(8);
    expect(r?.items[0].insert).toBe("金髪ロング");
  });
  it("候補の対象外・カテゴリOFFのフレーズは出さない", () => {
    const d: PhraseData = {
      version: 1,
      categories: [cat("c1", "髪", false)],
      phrases: [ph("1", "金髪", "blonde hair", { candidate: false }), ph("2", "銀髪", "blue hair", { categoryId: "c1" })],
    };
    expect(at("bl", "en", d)).toBeNull();
  });
  it("英数字 1 文字では候補を出さない", () => {
    expect(at("b", "en")).toBeNull();
  });
  it("入力済みと同じもの・挿入側が空のものは出さない", () => {
    expect(at("blue eyes", "en")).toBeNull();
    expect(at("赤", "en", data([ph("1", "赤い目", "")]))).toBeNull();
  });
});

describe("applySuggestion", () => {
  it("範囲を置き換え、後ろの文字列は残す", () => {
    expect(applySuggestion("1girl, bl, smile", 7, 9, "blonde hair")).toEqual({
      value: "1girl, blonde hair, smile",
      caret: 18,
    });
  });
});
