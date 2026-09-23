import { describe, expect, it } from "vitest";
import { applyPicks, drawPicks, parseGroups, reconcilePicks } from ".";

/** 決まった値を順に返す疑似乱数（Math.random のモックは使わない） */
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe("parseGroups / applyPicks", () => {
  it("スラッシュ無しの[]は対象外", () => {
    expect(parseGroups("[cat:dog:0.5] [a / b]")).toHaveLength(1);
  });
  it("選択肢をトリムして置換する", () => {
    expect(applyPicks("[赤 / 青 / 緑]の服", [1])).toBe("青の服");
  });
  it("複数グループと前後の文字列を保持する", () => {
    expect(applyPicks("x [a/b] y [c/d] z", [1, 0])).toBe("x b y c z");
  });
  it("未抽選のグループは先頭の選択肢", () => {
    expect(applyPicks("[a / b]", [])).toBe("a");
  });
});

describe("drawPicks", () => {
  it("日英で選択肢数が同じなら同じ位置を選ぶ", () => {
    expect(drawPicks("[赤 / 青]", "[red / blue]", seq(0.9, 0.1))).toEqual({ ja: [1], en: [1] });
  });
  it("選択肢数が違えば日英で別々に抽選する", () => {
    expect(drawPicks("[赤 / 青]", "[red / blue / green]", seq(0.1, 0.9))).toEqual({
      ja: [0],
      en: [2],
    });
  });
});

describe("reconcilePicks", () => {
  it("選択肢数が変わらなければ抽選結果を保持する", () => {
    const r = reconcilePicks(
      { ja: "[a / b]", en: "" },
      { ja: "[a / bb]", en: "" },
      { ja: [1], en: [] },
      seq(0),
    );
    expect(r.ja).toEqual([1]);
  });
  it("選択肢数が変わったグループは抽選し直す", () => {
    const r = reconcilePicks(
      { ja: "[a / b]", en: "" },
      { ja: "[a / b / c]", en: "" },
      { ja: [0], en: [] },
      seq(0.99),
    );
    expect(r.ja).toEqual([2]);
  });
});
