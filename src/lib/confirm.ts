import { ask } from "@tauri-apps/plugin-dialog";

/** OS ネイティブの確認ダイアログ（OK=true / キャンセル=false） */
export function confirmDialog(message: string): Promise<boolean> {
  return ask(message, { title: "確認", kind: "warning", okLabel: "OK", cancelLabel: "キャンセル" });
}
