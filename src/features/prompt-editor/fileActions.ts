import { dirname, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { confirmDialog, showError } from "../../lib/confirm";
import { readTextFile, resolvePromptDir, writeTextFile } from "../../lib/files";
import { parseDoc, serializeDoc } from "../../lib/markdown";
import { selectIsDirty, usePromptStore } from "../../stores/promptStore";
import { useSettingsStore } from "../../stores/settingsStore";

const MD_FILTERS = [{ name: "Markdown", extensions: ["md"] }];

const pad = (n: number) => String(n).padStart(2, "0");
const defaultFileName = (d = new Date()) =>
  `prompt-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.md`;

const ensureMdExt = (p: string) => (/\.md$/i.test(p) ? p : `${p}.md`);

const settingsDir = () => resolvePromptDir(useSettingsStore.getState().promptDir);

/** 今のドキュメントを指定パスに書き込み、保存済みにする */
async function writeDoc(path: string): Promise<void> {
  await writeTextFile(path, serializeDoc(usePromptStore.getState().doc));
  usePromptStore.getState().markSaved(path);
}

/** 取り込み：未保存確認 → 保存先フォルダでファイル選択 → 復元・抽選 */
export async function importPrompt(): Promise<void> {
  if (
    selectIsDirty(usePromptStore.getState()) &&
    !(await confirmDialog("保存していない変更があります。破棄して取り込みますか？"))
  )
    return;
  try {
    const path = await open({
      title: "取り込むファイルを選択",
      defaultPath: await settingsDir(),
      multiple: false,
      directory: false,
      filters: MD_FILTERS,
    });
    if (!path) return;
    const doc = parseDoc(await readTextFile(path));
    usePromptStore.getState().loadDoc(doc, path);
  } catch (e) {
    await showError("取り込みに失敗しました", e);
  }
}

/**
 * MD新規保存：保存ダイアログでファイル名を決めて保存する。
 * 開くフォルダ：今のファイルのフォルダ（無ければ設定の保存先フォルダ）
 * @returns 保存したら true、キャンセル・失敗なら false
 */
export async function savePromptAs(): Promise<boolean> {
  try {
    const { filePath } = usePromptStore.getState();
    const dir = filePath
      ? await resolvePromptDir(await dirname(filePath)) // フォルダが消えていれば既定へ
      : await settingsDir();
    const picked = await save({
      title: "MD新規保存",
      defaultPath: await join(dir, defaultFileName()),
      filters: MD_FILTERS,
    });
    if (!picked) return false;
    await writeDoc(ensureMdExt(picked));
    return true;
  } catch (e) {
    await showError("保存に失敗しました", e);
    return false;
  }
}

/**
 * MD保存：今のファイルに上書き保存する（保存先が無ければ新規保存）。
 * @returns 保存したら true、キャンセル・失敗なら false
 */
export async function savePrompt(): Promise<boolean> {
  const { filePath } = usePromptStore.getState();
  if (!filePath) return savePromptAs();
  try {
    await writeDoc(filePath);
    return true;
  } catch (e) {
    await showError("上書き保存に失敗しました", e);
    return false;
  }
}
