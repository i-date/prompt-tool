import { getCurrentWindow } from "@tauri-apps/api/window";
import { type ResolvedTheme, resolveTheme, sanitizeThemeMode, THEME_CACHE_KEY, type ThemeMode } from "../lib/theme";

export const systemDarkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

/** <html data-theme="light|dark"> を設定する。次回起動用にモードを覚えておく */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode, systemDarkQuery().matches);
  document.documentElement.dataset.theme = resolved;
  try {
    localStorage.setItem(THEME_CACHE_KEY, mode);
  } catch {
    // 保存できなくても表示には影響しない
  }
  return resolved;
}

/** タイトルバーの色を合わせる（null = OS に従う） */
export async function applyWindowTheme(mode: ThemeMode): Promise<void> {
  try {
    await getCurrentWindow().setTheme(mode === "system" ? null : mode);
  } catch (e) {
    // 権限がない環境ではタイトルバーだけ OS のまま（画面の色には影響しない）
    console.warn("タイトルバーのテーマを変更できませんでした", e);
  }
}

/** 起動直後、React の描画前に呼ぶ。前回のモードで表示してちらつきを防ぐ */
export function bootTheme(): void {
  let cached: string | null = null;
  try {
    cached = localStorage.getItem(THEME_CACHE_KEY);
  } catch {
    // 読めなければシステム設定
  }
  const mode = sanitizeThemeMode(cached);
  applyTheme(mode);
  void applyWindowTheme(mode);
}
