import { create } from "zustand";
import type { InsertTarget } from "../lib/phrases/insert";

export type InsertNotice = { kind: "ok" | "warn"; text: string };

/** フレーズ一覧の「挿入」の挿入先（プロンプト作成で最後に入力した欄）。ファイルには保存しない */
type State = {
  target: InsertTarget | null;
  notice: InsertNotice | null;
  setTarget: (target: InsertTarget | null) => void;
  setNotice: (notice: InsertNotice | null) => void;
};

export const useInsertTargetStore = create<State>()((set) => ({
  target: null,
  notice: null,
  setTarget: (target) => set({ target }),
  setNotice: (notice) => set({ notice }),
}));
