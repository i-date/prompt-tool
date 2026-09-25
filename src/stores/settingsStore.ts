import { load, type Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { DEFAULT_HEADING_MODE, type HeadingMode, sanitizeHeadingMode } from "../lib/headingMode";
import { DEFAULT_LANG_VIEW, type LangView, sanitizeLangView } from "../lib/langView";

export type Settings = {
  trimContent: boolean;
  /** MD の保存先フォルダ（null なら既定：ドキュメント\PromptTool） */
  promptDir: string | null;
  /** プロンプト入力中にフレーズ候補を表示する */
  suggest: boolean;
  /** 候補を選んだとき、もう一方の言語の欄にも訳を追加する */
  suggestFillOther: boolean;
  /** プロンプト作成タブで表示する言語の列 */
  langView: LangView;
  /** プロンプト作成タブの見出しの扱い（表示して出力／表示のみ／非表示） */
  headingMode: HeadingMode;
};

const DEFAULTS: Settings = {
  trimContent: true,
  promptDir: null,
  suggest: true,
  suggestFillOther: true,
  langView: DEFAULT_LANG_VIEW,
  headingMode: DEFAULT_HEADING_MODE,
};

// %APPDATA%\<identifier>\settings.json に保存される
let storePromise: Promise<Store> | null = null;
const getStore = () =>
  (storePromise ??= load("settings.json", { defaults: { ...DEFAULTS }, autoSave: false }));

async function persist<K extends keyof Settings>(key: K, value: Settings[K]) {
  const store = await getStore();
  await store.set(key, value);
  await store.save();
}

type SettingsState = Settings & {
  loaded: boolean;
  init: () => Promise<void>;
  setTrimContent: (v: boolean) => Promise<void>;
  setPromptDir: (dir: string | null) => Promise<void>;
  setSuggest: (v: boolean) => Promise<void>;
  setSuggestFillOther: (v: boolean) => Promise<void>;
  setLangView: (v: LangView) => Promise<void>;
  setHeadingMode: (v: HeadingMode) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>()((set) => ({
  ...DEFAULTS,
  loaded: false,

  init: async () => {
    const store = await getStore();
    const trimContent = (await store.get<boolean>("trimContent")) ?? DEFAULTS.trimContent;
    const promptDir = (await store.get<string | null>("promptDir")) ?? DEFAULTS.promptDir;
    const suggest = (await store.get<boolean>("suggest")) ?? DEFAULTS.suggest;
    const suggestFillOther = (await store.get<boolean>("suggestFillOther")) ?? DEFAULTS.suggestFillOther;
    const langView = sanitizeLangView(await store.get("langView"));
    const headingMode = sanitizeHeadingMode(await store.get("headingMode"));
    set({ trimContent, promptDir, suggest, suggestFillOther, langView, headingMode, loaded: true });
  },
  setTrimContent: async (v) => {
    set({ trimContent: v });
    await persist("trimContent", v);
  },
  setPromptDir: async (dir) => {
    set({ promptDir: dir });
    await persist("promptDir", dir);
  },
  setSuggest: async (v) => {
    set({ suggest: v });
    await persist("suggest", v);
  },
  setSuggestFillOther: async (v) => {
    set({ suggestFillOther: v });
    await persist("suggestFillOther", v);
  },
  setLangView: async (v) => {
    set({ langView: v });
    await persist("langView", v);
  },
  setHeadingMode: async (v) => {
    set({ headingMode: v });
    await persist("headingMode", v);
  },
}));
