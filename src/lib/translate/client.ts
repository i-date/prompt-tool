import { invoke } from "@tauri-apps/api/core";
import { useTranslationSettingsStore } from "../../stores/translationSettingsStore";
import type { Engine } from "./settings";
import { type Marker, type TranslateOutcome, translatePreservingSyntax } from "./syntax";

export type TransLang = "ja" | "en";

const MARKER: Record<Engine, Marker> = { deepl: "xml", google: "html", ollama: "brace" };

export async function translateTexts(texts: string[], source: TransLang, target: TransLang): Promise<TranslateOutcome> {
  const s = await useTranslationSettingsStore.getState().ensureLoaded();
  if (!s.enabled) throw new Error("翻訳機能は無効になっています（設定タブで有効にできます）");
  return translatePreservingSyntax(texts, MARKER[s.engine], target, (items) =>
    invoke<string[]>("translate_texts", {
      req: { engine: s.engine, source, target, texts: items, ollamaUrl: s.ollamaUrl, ollamaModel: s.ollamaModel },
    }),
  );
}
