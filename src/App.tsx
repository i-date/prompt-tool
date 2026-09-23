import { useEffect, useState } from "react";
import "./App.css";
import { HeaderTabs } from "./app/HeaderTabs";
import { PromptEditorPage } from "./features/prompt-editor/PromptEditorPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useCloseGuard } from "./hooks/useCloseGuard";
import { useSettingsStore } from "./stores/settingsStore";
import type { TabKey } from "./types";

function App() {
  const [tab, setTab] = useState<TabKey>("prompt");
  useCloseGuard();

  useEffect(() => {
    useSettingsStore
      .getState()
      .init()
      .catch((e) => console.error("設定の読み込みに失敗しました", e));
  }, []);

  return (
    <div className="app">
      <HeaderTabs active={tab} onChange={setTab} />
      <main className="app__main">
        {tab === "prompt" && <PromptEditorPage />}
        {tab === "phrases" && <p className="placeholder">フレーズ管理画面は M3 で実装予定です。</p>}
        {tab === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
