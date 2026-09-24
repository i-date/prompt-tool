import { describe, expect, it } from "vitest";
import { sanitizeLangView, visibleLangs } from "./langView";

describe("sanitizeLangView", () => {
  it("正しい値はそのまま", () => {
    expect(sanitizeLangView("both")).toBe("both");
    expect(sanitizeLangView("ja")).toBe("ja");
    expect(sanitizeLangView("en")).toBe("en");
  });
  it("未保存・不正値は両方表示", () => {
    expect(sanitizeLangView(undefined)).toBe("both");
    expect(sanitizeLangView("fr")).toBe("both");
    expect(sanitizeLangView(1)).toBe("both");
  });
});

describe("visibleLangs", () => {
  it("both は 日本語 → English の順", () => {
    expect(visibleLangs("both")).toEqual(["ja", "en"]);
  });
  it("片方だけ", () => {
    expect(visibleLangs("ja")).toEqual(["ja"]);
    expect(visibleLangs("en")).toEqual(["en"]);
  });
});
