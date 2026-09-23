import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { confirmDialog } from "../lib/confirm";
import { selectIsDirty, usePromptStore } from "../stores/promptStore";

/** ウィンドウを閉じるとき、未保存の変更があれば確認を出す */
export function useCloseGuard() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (!selectIsDirty(usePromptStore.getState())) return;
        const ok = await confirmDialog("保存していない変更があります。終了しますか？");
        if (!ok) event.preventDefault();
      })
      .then((fn) => {
        if (disposed) fn(); // StrictMode の二重実行対策
        else unlisten = fn;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
