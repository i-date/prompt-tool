import { ask, message } from "@tauri-apps/plugin-dialog";

/** OS ネイティブの確認ダイアログ（OK=true / キャンセル=false） */
export function confirmDialog(text: string): Promise<boolean> {
  return ask(text, { title: "確認", kind: "warning", okLabel: "OK", cancelLabel: "キャンセル" });
}

/** エラーダイアログ（Rust 側のエラーは文字列で届く） */
export async function showError(title: string, e: unknown): Promise<void> {
  const detail = e instanceof Error ? e.message : String(e);
  await message(detail, { title, kind: "error" });
}
