import { create } from "zustand";

export const TRANSLATE_PARTS = ["heading", "content"] as const;
export type TranslatePart = (typeof TRANSLATE_PARTS)[number];

const keyOf = (setId: string, part: string) => `${setId}:${part}`;

/** 各行の「翻訳対象」チェック。既定は対象で、OFF にしたものだけ記録（MD には保存しない） */
type State = { off: Record<string, true>; setTarget: (setId: string, part: string, on: boolean) => void };

export const useTranslateTargetStore = create<State>()((set) => ({
  off: {},
  setTarget: (setId, part, on) =>
    set((s) => {
      const off = { ...s.off };
      const k = keyOf(setId, part);
      if (on) delete off[k];
      else off[k] = true;
      return { off };
    }),
}));

export const isTranslateTarget = (off: Record<string, true>, setId: string, part: string): boolean =>
  !off[keyOf(setId, part)];
