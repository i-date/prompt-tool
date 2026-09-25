import { describe, expect, it } from "vitest";
import { applyPicks, drawPicks, exclusionWarnings, parseOption, reconcilePicks } from ".";

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};
const T = "[金髪 / 黒髪]と[赤い目 / 青い目!金髪]";

describe("parseOption", () => {
  it("「選択肢!相手」を分ける", () => {
    expect(parseOption("青い目!金髪")).toEqual({ text: "青い目", excludes: ["金髪"], invalid: false });
  });
  it("相手は複数書ける・前後の空白は除く", () => {
    expect(parseOption("青い目 ! 金髪 !銀髪")).toEqual({ text: "青い目", excludes: ["金髪", "銀髪"], invalid: false });
  });
  it("\\! は文字の !", () => {
    expect(parseOption("wow\\!")).toEqual({ text: "wow!", excludes: [], invalid: false });
  });
  it("a! / !a / !! は文字として扱う", () => {
    for (const raw of ["a!", "!a", "a!!b", "!!"]) {
      expect(parseOption(raw)).toEqual({ text: raw, excludes: [], invalid: true });
    }
  });
});

describe("applyPicks", () => {
  it("!相手 を取り除き、\\! を ! に戻す", () => {
    expect(applyPicks(T, [1, 1])).toBe("黒髪と青い目");
    expect(applyPicks("[wow\\! / ok]", [0])).toBe("wow!");
  });
  it("グループの外と / の無い [] の ! はそのまま", () => {
    expect(applyPicks("hi! [a / b] [x!y]", [0])).toBe("hi! a [x!y]");
  });
});

describe("drawPicks：除外", () => {
  it("許可された 3 通りから均等に選ぶ", () => {
    expect(drawPicks(T, "", seq(0)).ja).toEqual([0, 0]);
    expect(drawPicks(T, "", seq(0.5)).ja).toEqual([1, 0]);
    expect(drawPicks(T, "", seq(0.99)).ja).toEqual([1, 1]);
  });
  it("何度抽選しても除外の組み合わせは出ない（逆側に書いても同じ）", () => {
    for (const t of [T, "[金髪!青い目 / 黒髪]と[赤い目 / 青い目]"]) {
      for (let i = 0; i < 300; i++) expect(drawPicks(t, "").ja).not.toEqual([0, 1]);
    }
  });
  it("日英の構造が同じなら、英語欄にだけ書いた除外も両方に効く", () => {
    const ja = "[金髪 / 黒髪]と[赤い目 / 青い目]";
    const en = "[blonde / black] [red / blue!blonde]";
    expect(drawPicks(ja, en, seq(0.99))).toEqual({ ja: [1, 1], en: [1, 1] });
    for (let i = 0; i < 300; i++) {
      const r = drawPicks(ja, en);
      expect(r.ja).not.toEqual([0, 1]);
      expect(r.en).toEqual(r.ja);
    }
  });
  it("すべて除外されたときは除外を無視して抽選する", () => {
    expect(drawPicks("[a!c!d / b!c!d] [c / d]", "", seq(0, 0.99)).ja).toEqual([0, 1]);
  });
});

describe("reconcilePicks：除外", () => {
  const prev = { ja: "[金髪 / 黒髪]と[赤い目 / 青い目]", en: "" };
  const next = { ja: T, en: "" };
  it("前回の結果が除外に当たるようになったら抽選し直す", () => {
    expect(reconcilePicks(prev, next, { ja: [0, 1], en: [] }, seq(0.99)).ja).toEqual([1, 1]);
  });
  it("当たらなければ保持する", () => {
    expect(reconcilePicks(prev, next, { ja: [1, 1], en: [] }, seq(0)).ja).toEqual([1, 1]);
  });
});

describe("exclusionWarnings", () => {
  it("除外が無ければ警告なし", () => {
    expect(exclusionWarnings("[a / b]", "[x / y]")).toEqual([]);
  });
  it("相手が見つからない・! の書き間違いを警告する", () => {
    const w = exclusionWarnings("[a!zzz / b] [wow! / c]", "");
    expect(w).toHaveLength(2);
    expect(w[0]).toContain("zzz");
    expect(w[1]).toContain("wow!");
  });
  it("すべて除外されていれば警告する", () => {
    expect(exclusionWarnings("[a!c!d / b!c!d] [c / d]", "").some((s) => s.includes("すべての組み合わせ"))).toBe(true);
  });
});
