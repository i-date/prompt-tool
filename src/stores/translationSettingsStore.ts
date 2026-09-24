import { invoke } from "@tauri-apps/api/core";
import { load, type Store } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import {
  DEFAULT_TRANSLATION_SETTINGS,
  sanitizeTranslationSettings,
  type TranslationSettings,
} from "../lib/translate/settings";

export type Provider = "deepl" | "google";
export type KeyStatus = { registered: boolean; free: boolean };

type State = {
  settings: TranslationSettings;
  loaded: boolean;
  keyStatus: Partial<Record<Provider, KeyStatus>>;
  ensureLoaded: () => Promise<TranslationSettings>;
  update: (patch: Partial<TranslationSettings>) => Promise<void>;
  refreshKeyStatus: (provider: Provider) => Promise<void>;
};

const FILE = "translation.json";
const KEY = "translation";
let storePromise: Promise<Store> | null = null;
let loading: Promise<TranslationSettings> | null = null;
const getStore = (): Promise<Store> => {
  storePromise ??= load(FILE, { defaults: {}, autoSave: false });
  return storePromise;
};

export const useTranslationSettingsStore = create<State>()((set, get) => ({
  settings: DEFAULT_TRANSLATION_SETTINGS,
  loaded: false,
  keyStatus: {},

  ensureLoaded: () => {
    if (get().loaded) return Promise.resolve(get().settings);
    loading ??= (async () => {
      try {
        const store = await getStore();
        const settings = sanitizeTranslationSettings(await store.get(KEY));
        set({ settings, loaded: true });
        return settings;
      } catch (e) {
        loading = null;
        throw e;
      }
    })();
    return loading;
  },

  update: async (patch) => {
    await get().ensureLoaded();
    const next = sanitizeTranslationSettings({ ...get().settings, ...patch });
    set({ settings: next });
    const store = await getStore();
    await store.set(KEY, next);
    await store.save();
  },

  refreshKeyStatus: async (provider) => {
    const st = await invoke<KeyStatus>("api_key_status", { provider });
    set((s) => ({ keyStatus: { ...s.keyStatus, [provider]: st } }));
  },
}));
