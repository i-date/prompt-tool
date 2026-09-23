import { useEffect } from "react";
import { savePrompt, savePromptAs } from "./fileActions";

type Runner = (fn: () => Promise<boolean>) => Promise<void>;

/** Ctrl+S：MD保存 / Ctrl+Shift+S：MD新規保存（このフックを使う画面の表示中のみ有効） */
export function useSaveShortcuts(run: Runner) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || !e.ctrlKey || e.altKey || e.metaKey || e.code !== "KeyS") return;
      e.preventDefault();
      if (e.repeat) return; // 押しっぱなしで連続保存しない
      void run(e.shiftKey ? savePromptAs : savePrompt);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run]);
}
