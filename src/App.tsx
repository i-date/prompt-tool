import { useEffect, useState } from "react";
import "./App.css";
import { HeaderTabs } from "./app/HeaderTabs";
import { CategoriesPage } from "./features/categories/CategoriesPage";
import { PhrasesPage } from "./features/phrases/PhrasesPage";
import { PromptEditorPage } from "./features/prompt-editor/PromptEditorPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useCloseGuard } from "./hooks/useCloseGuard";
import { useSettingsStore } from "./stores/settingsStore";
import { useTranslationSettingsStore } from "./stores/translationSettingsStore";
import type { TabKey } from "./types";

function App() {
  const [tab, setTab] = useState<TabKey>("prompt");
  useCloseGuard();

  useEffect(() => {
    useSettingsStore
      .getState()
      .init()
      .catch((e) => console.error("設定の読み込みに失敗しました", e));
    // 翻訳ボタンの表示／非表示を決めるため、起動時に読み込んでおく
    useTranslationSettingsStore
      .getState()
      .ensureLoaded()
      .catch((e) => console.error("翻訳設定の読み込みに失敗しました", e));
  }, []);

  return (
    <div className="app">
      <HeaderTabs active={tab} onChange={setTab} />
      <main className="app__main">
        {tab === "prompt" && <PromptEditorPage />}
        {tab === "phrases" && <PhrasesPage />}
        {tab === "categories" && <CategoriesPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
