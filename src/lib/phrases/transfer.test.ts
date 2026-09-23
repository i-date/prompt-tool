import { describe, expect, it } from "vitest";
import { parsePhraseData, serializePhraseData } from "./schema";
import { cat, ph } from "./testUtils";
import { applyImport, jsonToPayload } from "./transfer";
import { emptyPhraseData, type PhraseData } from "./types";

const current: PhraseData = { version: 1, categories: [cat("c1", "人物")], phrases: [ph("1", "黒髪", "black hair", { categoryId: "c1" })] };
const item = (ja: string, en: string, categoryName: string | null = null) => ({ ja, en, categoryName, tags: [], candidate: true });

describe("transfer", () => {
  it("追加モード: 重複はスキップし、同名カテゴリは再利用（既存フラグ維持）", () => {
    const r = applyImport(current, {
      categories: [{ name: "人物", candidate: false }, { name: "背景", candidate: true }],
      phrases: [item("黒髪", "BLACK HAIR"), item("教室", "classroom", "背景"), item("笑顔", "smile", "人物")],
    }, "merge");
    expect([r.added, r.skipped, r.categoriesAdded]).toEqual([2, 1, 1]);
    expect(r.data.categories.map((c) => [c.name, c.candidate])).toEqual([["人物", true], ["背景", true]]);
    expect(r.data.phrases.find((p) => p.ja === "笑顔")?.categoryId).toBe("c1");
  });
  it("置き換えモード: 既存データは残らない", () => {
    const r = applyImport(current, { categories: [], phrases: [item("教室", "classroom")] }, "replace");
    expect(r.data.categories).toEqual([]);
    expect(r.data.phrases.map((p) => p.ja)).toEqual(["教室"]);
  });
  it("JSON エクスポート→取り込みで並び順・フラグ・日時を保つ", () => {
    const data: PhraseData = {
      version: 1,
      categories: [cat("c2", "背景", false), cat("c1", "人物")],
      phrases: [ph("2", "教室", "classroom", { categoryId: "c2", tags: ["屋内"], candidate: false }), ph("1", "黒髪", "black hair", { categoryId: "c1" })],
    };
    const r = applyImport(emptyPhraseData(), jsonToPayload(serializePhraseData(data)), "replace");
    expect(r.data.categories.map((c) => [c.name, c.candidate])).toEqual([["背景", false], ["人物", true]]);
    expect(r.data.phrases.map((p) => [p.ja, p.tags, p.candidate, p.createdAt])).toEqual([
      ["教室", ["屋内"], false, "2026-01-01T00:00:00.000Z"],
      ["黒髪", [], true, "2026-01-01T00:00:00.000Z"],
    ]);
    expect(r.data.phrases[0].categoryId).toBe(r.data.categories[0].id);
  });
  it("欠けた項目を補い、存在しないカテゴリ参照は未分類にする", () => {
    const d = parsePhraseData(JSON.stringify({ phrases: [{ ja: "笑顔", categoryId: "nope" }, { ja: "", en: "" }] }));
    expect(d.categories).toEqual([]);
    expect(d.phrases).toHaveLength(1);
    expect(d.phrases[0]).toMatchObject({ ja: "笑顔", en: "", categoryId: null, tags: [], candidate: true });
  });
});
