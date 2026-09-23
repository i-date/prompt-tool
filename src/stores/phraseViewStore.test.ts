import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_FILTER } from "../lib/phrases/search";
import { usePhraseViewStore } from "./phraseViewStore";

describe("phraseViewStore", () => {
  beforeEach(() => usePhraseViewStore.getState().reset());

  it("setFilter は指定した条件だけ更新し、他の条件とソートを保つ", () => {
    const s = usePhraseViewStore.getState();
    s.setSort({ key: "ja", dir: "asc" });
    s.setFilter({ query: "黒髪" });
    s.setFilter({ tag: "髪" });
    const now = usePhraseViewStore.getState();
    expect(now.filter).toEqual({ query: "黒髪", categoryId: "", tag: "髪" });
    expect(now.sort).toEqual({ key: "ja", dir: "asc" });
  });

  it("resetFilter は絞り込みだけ、reset は全体を初期状態に戻す", () => {
    const s = usePhraseViewStore.getState();
    s.setFilter({ query: "a" });
    s.setSort({ key: "en", dir: "desc" });
    s.resetFilter();
    expect(usePhraseViewStore.getState().filter).toEqual(EMPTY_FILTER);
    expect(usePhraseViewStore.getState().sort).toEqual({ key: "en", dir: "desc" });
    s.reset();
    expect(usePhraseViewStore.getState().sort).toBeNull();
  });
});
