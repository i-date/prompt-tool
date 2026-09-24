import { describe, expect, it } from "vitest";
import { autoHeightPx, groupHeightPx, parseLineHeight } from "./autosize";

// line-height 21px（14px × 1.5）、上下 padding 6px ずつ、border 1px ずつ
const base = { lineHeight: 21, borderY: 2, extraLines: 1 };
const lines = (n: number) => ({ ...base, scrollHeight: 21 * n + 12 });

describe("autoHeightPx", () => {
  it("空（1 行ぶん）なら 2 行ぶんの高さになる", () => {
    expect(autoHeightPx(lines(1))).toBe(21 * 2 + 12 + 2);
  });
  it("3 行なら 4 行ぶんの高さになる", () => {
    expect(autoHeightPx(lines(3))).toBe(21 * 4 + 12 + 2);
  });
  it("extraLines を変えられる", () => {
    expect(autoHeightPx({ ...base, extraLines: 0, scrollHeight: 45 })).toBe(47);
  });
  it("小数は切り上げる", () => {
    expect(autoHeightPx({ lineHeight: 20.5, borderY: 2, extraLines: 1, scrollHeight: 30 })).toBe(53);
  });
});

describe("groupHeightPx", () => {
  it("日英で行数が違うときは多いほう + 1 行にそろえる", () => {
    expect(groupHeightPx([lines(1), lines(3)])).toBe(autoHeightPx(lines(3)));
    expect(groupHeightPx([lines(5), lines(2)])).toBe(autoHeightPx(lines(5)));
  });
  it("同じ行数ならその高さ", () => {
    expect(groupHeightPx([lines(2), lines(2)])).toBe(autoHeightPx(lines(2)));
  });
  it("欄が無ければ 0", () => {
    expect(groupHeightPx([])).toBe(0);
  });
});

describe("parseLineHeight", () => {
  it("px 指定はそのまま使う", () => {
    expect(parseLineHeight("21px", "14px")).toBe(21);
  });
  it("normal などは fontSize × 1.2", () => {
    expect(parseLineHeight("normal", "15px")).toBeCloseTo(18);
  });
  it("fontSize も読めなければ 14px 基準", () => {
    expect(parseLineHeight("normal", "")).toBeCloseTo(16.8);
  });
});
