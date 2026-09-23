import { invoke } from "@tauri-apps/api/core";

export const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

/** UTF-8 のテキストファイルを読み込む（BOM は除去） */
export const readTextFile = (path: string) => invoke<string>("read_text_file", { path });

/** 存在しなければ null（外部変更の検出用） */
export const readTextFileOpt = (path: string) => invoke<string | null>("read_text_file_opt", { path });

/** 一時ファイル経由で安全に書き込む */
export const writeTextFile = (path: string, contents: string) =>
  invoke<void>("write_text_file", { path, contents });

/** 指定フォルダが存在すればそれを、無ければ既定フォルダ（作成済み）を返す */
export const resolvePromptDir = (preferred: string | null) =>
  invoke<string>("resolve_prompt_dir", { preferred });

/** %APPDATA%\<identifier>\phrases.json（backup=true なら .bak）を読む。無ければ null */
export const loadPhrasesFile = (backup: boolean) =>
  invoke<string | null>("load_phrases_file", { backup });

/** phrases.json を保存する（直前の内容を .bak に退避） */
export const savePhrasesFile = (contents: string) => invoke<void>("save_phrases_file", { contents });
