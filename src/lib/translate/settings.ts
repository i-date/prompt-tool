export type Engine = "deepl" | "google" | "ollama";
export type TranslationSettings = {
  /** false のとき翻訳関連の UI をすべて隠す（エンジン等の設定は保持） */
  enabled: boolean;
  engine: Engine;
  ollamaUrl: string;
  ollamaModel: string;
};

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  enabled: false, // 既定は無効。設定タブで有効にしたときだけ翻訳 UI を出す
  engine: "deepl",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "translategemma",
};

const ENGINES: readonly Engine[] = ["deepl", "google", "ollama"];

export function sanitizeTranslationSettings(raw: unknown): TranslationSettings {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const str = (v: unknown, d: string) => (typeof v === "string" && v.trim() !== "" ? v.trim() : d);
  const D = DEFAULT_TRANSLATION_SETTINGS;
  return {
    // true が明示的に保存されているときだけ有効。未保存・旧設定ファイル・不正値は無効
    enabled: typeof o.enabled === "boolean" ? o.enabled : D.enabled,
    engine: ENGINES.includes(o.engine as Engine) ? (o.engine as Engine) : D.engine,
    ollamaUrl: str(o.ollamaUrl, D.ollamaUrl),
    ollamaModel: str(o.ollamaModel, D.ollamaModel),
  };
}
