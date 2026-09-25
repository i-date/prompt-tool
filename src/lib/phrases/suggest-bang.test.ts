import { describe, expect, it } from "vitest";
import { tokenAt } from "./suggest";

describe("tokenAt と !", () => {
  it("入力途中のランダムグループでは ! の後ろから語句になる", () => {
    const v = "[赤い目 / 青い目!金";
    expect(tokenAt(v, v.length)).toEqual({ start: v.indexOf("!") + 1, end: v.length });
  });
  it("閉じたグループの中でも同じ", () => {
    const v = "[red / blue!bl]";
    const caret = v.indexOf("]");
    expect(tokenAt(v, caret)).toEqual({ start: v.indexOf("!") + 1, end: caret });
  });
  it("グループの外では ! で区切らない", () => {
    expect(tokenAt("wow!ya", 6)).toEqual({ start: 0, end: 6 });
  });
  it("\\! は区切らない", () => {
    const v = "[a / wo\\!w";
    expect(tokenAt(v, v.length)).toEqual({ start: v.indexOf("wo"), end: v.length });
  });
});
