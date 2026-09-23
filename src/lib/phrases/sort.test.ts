import { describe, expect, it } from "vitest";
import { nextSort, sortPhrases } from "./sort";
import { cat, ph } from "./testUtils";

describe("sort", () => {
  it("昇順→降順→解除 を繰り返す", () => {
    const a = nextSort(null, "ja");
    expect(a).toEqual({ key: "ja", dir: "asc" });
    const b = nextSort(a, "ja");
    expect(b).toEqual({ key: "ja", dir: "desc" });
    expect(nextSort(b, "ja")).toBeNull();
    expect(nextSort(b, "en")).toEqual({ key: "en", dir: "asc" });
  });
  it("空欄は昇順・降順どちらでも末尾", () => {
    const list = [ph("1", "", "b"), ph("2", "い", "a"), ph("3", "あ", "c")];
    expect(sortPhrases(list, { key: "ja", dir: "asc" }, []).map((p) => p.id)).toEqual(["3", "2", "1"]);
    expect(sortPhrases(list, { key: "ja", dir: "desc" }, []).map((p) => p.id)).toEqual(["2", "3", "1"]);
  });
  it("候補ソートはカテゴリOFFも対象外として扱う", () => {
    const cats = [cat("off", "背景", false)];
    const list = [ph("1", "a", "a", { categoryId: "off" }), ph("2", "b", "b"), ph("3", "c", "c", { candidate: false }), ph("4", "d", "d")];
    expect(sortPhrases(list, { key: "candidate", dir: "asc" }, cats).map((p) => p.id)).toEqual(["2", "4", "1", "3"]);
  });
});
