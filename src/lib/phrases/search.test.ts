import { describe, expect, it } from "vitest";
import { filterPhrases, UNCATEGORIZED } from "./search";
import { normalizeTags } from "./text";
import { cat, ph } from "./testUtils";
import type { PhraseData } from "./types";

const data: PhraseData = {
  version: 1,
  categories: [cat("c1", "人物")],
  phrases: [
    ph("1", "黒髪", "black hair", { categoryId: "c1", tags: ["髪"] }),
    ph("2", "教室", "classroom", { tags: ["背景"] }),
    ph("3", "笑顔", "smile"),
  ],
};
const f = (query: string, categoryId = "", tag = "") => ({ query, categoryId, tag });

describe("search", () => {
  it("タグは前後空白を除き、全角・大小文字違いの重複をまとめる", () => {
    expect(normalizeTags(["Cat", "ｃａｔ", " 犬 ", ""])).toEqual(["Cat", "犬"]);
  });
  it("空白区切りは AND で、日英・カテゴリ名・タグを横断する", () => {
    expect(filterPhrases(data, f("人物 ＢＬＡＣＫ")).map((p) => p.id)).toEqual(["1"]);
    expect(filterPhrases(data, f("背景")).map((p) => p.id)).toEqual(["2"]);
  });
  it("未分類・タグで絞り込める", () => {
    expect(filterPhrases(data, f("", UNCATEGORIZED)).map((p) => p.id)).toEqual(["2", "3"]);
    expect(filterPhrases(data, f("", "", "背景")).map((p) => p.id)).toEqual(["2"]);
  });
});
