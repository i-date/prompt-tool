import { useEffect } from "react";
import { applyTheme, applyWindowTheme, systemDarkQuery } from "../app/theme";
import { useSettingsStore } from "../stores/settingsStore";

/** 設定のモードを画面に反映する。システム設定のときは OS の切り替えにも追従する */
export function useApplyTheme(): void {
  const mode = useSettingsStore((s) => s.themeMode);
  const loaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) return; // 読み込み前は bootTheme() の表示のまま
    applyTheme(mode);
    void applyWindowTheme(mode);
    if (mode !== "system") return;

    const mq = systemDarkQuery();
    const onChange = () => applyTheme(mode);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, loaded]);
}
