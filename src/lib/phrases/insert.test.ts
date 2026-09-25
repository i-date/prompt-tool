import { describe, expect, it } from "vitest";
import type { PromptSet } from "../../types";
import { appendPhrase, containsPhrase, resolveTarget } from "./insert";

const set = (id: string): PromptSet => ({
  id,
  heading: { ja: "", en: "", output: true },
  content: { ja: "", en: "", output: true },
});

describe("appendPhrase", () => {
  it("空欄はそのまま入れる", () => {
    expect(appendPhrase("", " blonde hair ")).toEqual({ value: "blonde hair", changed: true });
  });
  it("末尾に , でつなぐ（既存の区切りや空白は整える）", () => {
    expect(appendPhrase("1girl", "smile").value).toBe("1girl, smile");
    expect(appendPhrase("1girl, ", "smile").value).toBe("1girl, smile");
    expect(appendPhrase("笑顔、", "金髪").value).toBe("笑顔、金髪");
  });
  it("改行で終わっていれば次の行に入れる", () => {
    expect(appendPhrase("1girl\n", "smile").value).toBe("1girl\nsmile");
  });
  it("既にある語句（[A / B] の中を含む）は追加しない", () => {
    expect(appendPhrase("1girl, Blonde Hair", "blonde hair").changed).toBe(false);
    expect(appendPhrase("[red / blonde hair] eyes", "blonde hair").changed).toBe(false);
  });
});

describe("containsPhrase", () => {
  it("部分一致ではなく区切り単位で比べる", () => {
    expect(containsPhrase("long blonde hair", "blonde hair")).toBe(false);
    expect(containsPhrase("金髪、青い目", "青い目")).toBe(true);
  });
});

describe("resolveTarget", () => {
  const sets = [set("a"), set("b")];
  it("指定のセットがあればそれを使う", () => {
    expect(resolveTarget(sets, { setId: "a", part: "heading" })).toEqual({ setId: "a", part: "heading", index: 0 });
  });
  it("指定なし・削除済みは最後のセットの内容、セットが無ければ null", () => {
    expect(resolveTarget(sets, { setId: "x", part: "heading" })).toEqual({ setId: "b", part: "content", index: 1 });
    expect(resolveTarget(sets, null)?.setId).toBe("b");
    expect(resolveTarget([], null)).toBeNull();
  });
  it("allowHeading: false なら見出しの指定は同じセットの内容になる", () => {
    expect(resolveTarget(sets, { setId: "a", part: "heading" }, { allowHeading: false })).toEqual({
      setId: "a",
      part: "content",
      index: 0,
    });
  });
});
