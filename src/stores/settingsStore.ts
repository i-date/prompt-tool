import { create } from "zustand";

/** アプリ全体の設定（M4 で plugin-store による保存に対応予定） */
type SettingsState = {
  trimContent: boolean;
  setTrimContent: (v: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()((set) => ({
  trimContent: true,
  setTrimContent: (v) => set({ trimContent: v }),
}));
