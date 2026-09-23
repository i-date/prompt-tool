import { create } from "zustand";
import { EMPTY_FILTER, type PhraseFilter } from "../lib/phrases/search";
import type { SortState } from "../lib/phrases/sort";

/** フレーズ一覧の表示状態（検索・絞り込み・ソート）。タブを切り替えても保持し、ファイルには保存しない */
type PhraseViewState = {
  filter: PhraseFilter;
  sort: SortState;
  setFilter: (patch: Partial<PhraseFilter>) => void;
  resetFilter: () => void;
  setSort: (sort: SortState) => void;
  reset: () => void;
};

export const usePhraseViewStore = create<PhraseViewState>()((set) => ({
  filter: EMPTY_FILTER,
  sort: null,
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  resetFilter: () => set({ filter: EMPTY_FILTER }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ filter: EMPTY_FILTER, sort: null }),
}));
