import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_MODE, resolveTheme, sanitizeThemeMode } from "./theme";

describe("sanitizeThemeMode", () => {
  it("既定はシステム設定", () => {
    expect(DEFAULT_THEME_MODE).toBe("system");
  });
  it("正しい値はそのまま", () => {
    expect(sanitizeThemeMode("light")).toBe("light");
    expect(sanitizeThemeMode("dark")).toBe("dark");
    expect(sanitizeThemeMode("system")).toBe("system");
  });
  it("不正な値・未設定はシステム設定", () => {
    expect(sanitizeThemeMode(undefined)).toBe("system");
    expect(sanitizeThemeMode(null)).toBe("system");
    expect(sanitizeThemeMode("Dark")).toBe("system");
    expect(sanitizeThemeMode(1)).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("システム設定は OS に従う", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("ライト／ダークは OS に関係なく固定", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
