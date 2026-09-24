import { describe, expect, it } from "vitest";
import { DEFAULT_TRANSLATION_SETTINGS, sanitizeTranslationSettings } from "./settings";

describe("sanitizeTranslationSettings", () => {
  it("未保存・不正値は既定（DeepL）になる", () => {
    expect(sanitizeTranslationSettings(undefined)).toEqual(DEFAULT_TRANSLATION_SETTINGS);
    expect(sanitizeTranslationSettings({ engine: "bing", ollamaUrl: 1, ollamaModel: "  " })).toEqual(DEFAULT_TRANSLATION_SETTINGS);
  });
  it("google / ollama を受け付け、値はトリムして採用する", () => {
    expect(sanitizeTranslationSettings({ engine: "google" }).engine).toBe("google");
    expect(sanitizeTranslationSettings({ engine: "ollama", ollamaUrl: " http://pc:11434 ", ollamaModel: "translategemma:12b" }))
      .toEqual({ engine: "ollama", ollamaUrl: "http://pc:11434", ollamaModel: "translategemma:12b" });
  });
});
