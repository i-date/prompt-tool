export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_MODES: readonly { value: ThemeMode; label: string }[] = [
  { value: "system", label: "システム設定" },
  { value: "light", label: "ライトモード" },
  { value: "dark", label: "ダークモード" },
];

export const DEFAULT_THEME_MODE: ThemeMode = "system";

/** 起動直後（settings.json を読む前）に使う、前回のモードの保存先 */
export const THEME_CACHE_KEY = "prompt-tool.themeMode";

export const sanitizeThemeMode = (v: unknown): ThemeMode =>
  v === "system" || v === "light" || v === "dark" ? v : DEFAULT_THEME_MODE;

/** 「システム設定」のときは OS の設定から、実際に使うライト／ダークを決める */
export const resolveTheme = (mode: ThemeMode, systemDark: boolean): ResolvedTheme =>
  mode === "system" ? (systemDark ? "dark" : "light") : mode;
