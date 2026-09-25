import { describe, expect, it } from "vitest";
import { headingOutput, headingVisible, sanitizeHeadingMode } from "./headingMode";

describe("sanitizeHeadingMode", () => {
  it("正しい値はそのまま、未保存・不正値は on", () => {
    expect(sanitizeHeadingMode("noOutput")).toBe("noOutput");
    expect(sanitizeHeadingMode("hidden")).toBe("hidden");
    expect(sanitizeHeadingMode(undefined)).toBe("on");
    expect(sanitizeHeadingMode("off")).toBe("on");
  });
});

describe("headingOutput / headingVisible", () => {
  it("on：表示して出力", () => {
    expect(headingOutput("on")).toBe(true);
    expect(headingVisible("on")).toBe(true);
  });
  it("noOutput：表示するが出力しない", () => {
    expect(headingOutput("noOutput")).toBe(false);
    expect(headingVisible("noOutput")).toBe(true);
  });
  it("hidden：表示も出力もしない", () => {
    expect(headingOutput("hidden")).toBe(false);
    expect(headingVisible("hidden")).toBe(false);
  });
});
