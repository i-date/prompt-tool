import { create } from "zustand";
import type { UndoEntry } from "../lib/translate/undo";

/** 直前の翻訳1回分だけを保持する */
type State = {
  label: string;
  entries: UndoEntry[];
  record: (label: string, entries: UndoEntry[]) => void;
  clear: () => void;
};

export const useTranslateUndoStore = create<State>()((set) => ({
  label: "",
  entries: [],
  record: (label, entries) => set({ label, entries }),
  clear: () => set({ label: "", entries: [] }),
}));
