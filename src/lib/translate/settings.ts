export type Engine = "deepl" | "google" | "ollama";
export type TranslationSettings = {
  /** false のとき翻訳関連の UI をすべて隠す（エンジン等の設定は保持） */
  enabled: boolean;
  engine: Engine;
  ollamaUrl: string;
  ollamaModel: string;
};

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  enabled: true,
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
    enabled: typeof o.enabled === "boolean" ? o.enabled : D.enabled, // 旧設定ファイル（項目なし）は有効扱い
    engine: ENGINES.includes(o.engine as Engine) ? (o.engine as Engine) : D.engine,
    ollamaUrl: str(o.ollamaUrl, D.ollamaUrl),
    ollamaModel: str(o.ollamaModel, D.ollamaModel),
  };
}
