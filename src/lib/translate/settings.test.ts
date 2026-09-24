import { describe, expect, it } from "vitest";
import { DEFAULT_TRANSLATION_SETTINGS, sanitizeTranslationSettings } from "./settings";

describe("sanitizeTranslationSettings", () => {
  it("既定値は無効・DeepL", () => {
    expect(DEFAULT_TRANSLATION_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_TRANSLATION_SETTINGS.engine).toBe("deepl");
  });
  it("未保存・不正値は既定（無効・DeepL）になる", () => {
    expect(sanitizeTranslationSettings(undefined)).toEqual(DEFAULT_TRANSLATION_SETTINGS);
    expect(
      sanitizeTranslationSettings({ enabled: "yes", engine: "bing", ollamaUrl: 1, ollamaModel: "  " }),
    ).toEqual(DEFAULT_TRANSLATION_SETTINGS);
  });
  it("google / ollama を受け付け、値はトリムして採用する", () => {
    expect(sanitizeTranslationSettings({ engine: "google" }).engine).toBe("google");
    expect(
      sanitizeTranslationSettings({
        enabled: true,
        engine: "ollama",
        ollamaUrl: " http://pc:11434 ",
        ollamaModel: "translategemma:12b",
      }),
    ).toEqual({ enabled: true, engine: "ollama", ollamaUrl: "http://pc:11434", ollamaModel: "translategemma:12b" });
  });
  it("有効にした設定は保持される", () => {
    expect(sanitizeTranslationSettings({ enabled: true, engine: "google" }))
      .toEqual({ ...DEFAULT_TRANSLATION_SETTINGS, enabled: true, engine: "google" });
  });
  it("無効にしてもエンジンの選択は保持される", () => {
    expect(sanitizeTranslationSettings({ enabled: false, engine: "google" }))
      .toEqual({ ...DEFAULT_TRANSLATION_SETTINGS, enabled: false, engine: "google" });
  });
  it("enabled の無い旧設定ファイルは無効として読む", () => {
    expect(sanitizeTranslationSettings({ engine: "ollama" }).enabled).toBe(false);
  });
});
