import type { Lang } from "../types";

/** プロンプト作成タブで表示する言語の列 */
export type LangView = "both" | Lang;

export const LANG_VIEWS: readonly { value: LangView; label: string }[] = [
  { value: "both", label: "日本語 + English" },
  { value: "ja", label: "日本語のみ" },
  { value: "en", label: "English のみ" },
];

export const DEFAULT_LANG_VIEW: LangView = "both";

/** 保存値の検証（不正値・未保存は両方表示） */
export const sanitizeLangView = (v: unknown): LangView =>
  v === "both" || v === "ja" || v === "en" ? v : DEFAULT_LANG_VIEW;

/** 表示する言語の一覧（表示順） */
export const visibleLangs = (v: LangView): Lang[] => (v === "both" ? ["ja", "en"] : [v]);

export const LANG_LABEL: Record<Lang, string> = { ja: "日本語", en: "English" };
