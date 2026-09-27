import { create } from "zustand";

export type ToastTone = "accent" | "error";
export type Toast = { id: number; text: string; tone: ToastTone };

type ToastState = {
  toasts: Toast[];
  show: (text: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

/** 表示時間（ミリ秒） */
export const TOAST_DURATION = 2000;
/** 同時に表示する最大件数（古いものから消す） */
export const TOAST_MAX = 3;

let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (text, tone = "accent") => {
    const id = ++seq;
    // 同じ文言は積み重ねず、新しいものに置き換える（連打しても通知が増えない）
    set((s) => ({
      toasts: [...s.toasts.filter((t) => t.text !== text), { id, text, tone }].slice(-TOAST_MAX),
    }));
    setTimeout(() => get().dismiss(id), TOAST_DURATION);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** コンポーネントの外からも呼べる短縮形 */
export const showToast = (text: string, tone?: ToastTone) => useToastStore.getState().show(text, tone);
