import { invoke } from "@tauri-apps/api/core";

/** UTF-8 のテキストファイルを読み込む（BOM は除去） */
export const readTextFile = (path: string) => invoke<string>("read_text_file", { path });

/** 一時ファイル経由で安全に書き込む */
export const writeTextFile = (path: string, contents: string) =>
  invoke<void>("write_text_file", { path, contents });

/** 指定フォルダが存在すればそれを、無ければ既定フォルダ（作成済み）を返す */
export const resolvePromptDir = (preferred: string | null) =>
  invoke<string>("resolve_prompt_dir", { preferred });
