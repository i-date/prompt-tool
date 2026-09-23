import { dirname, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { confirmDialog, showError } from "../../lib/confirm";
import {
  baseName,
  readTextFile,
  readTextFileOpt,
  resolvePromptDir,
  writeTextFile,
} from "../../lib/files";
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
  const text = serializeDoc(usePromptStore.getState().doc);
  await writeTextFile(path, text);
  usePromptStore.getState().markSaved(path, text);
}

/**
 * 最後に取り込み・保存した後で外部から変更されていれば確認する。
 * @returns 上書きしてよければ true
 */
async function confirmIfChanged(path: string, known: string | null): Promise<boolean> {
  const name = baseName(path);
  let current: string | null;
  try {
    current = await readTextFileOpt(path);
  } catch {
    return confirmDialog(
      `「${name}」が他のアプリで変更され、読み込めない状態になっています。\n上書きしますか？`,
    );
  }
  if (current === null || current === known) return true; // 消えていれば作り直す
  return confirmDialog(
    `「${name}」は、最後に取り込み・保存した後で他のアプリにより変更されています。\n` +
      "上書きすると、その変更は失われます。上書きしますか？\n" +
      "（キャンセルして「MD新規保存」で別名保存することもできます）",
  );
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
    const text = await readTextFile(path);
    usePromptStore.getState().loadDoc(parseDoc(text), path, text);
  } catch (e) {
    await showError("取り込みに失敗しました", e);
  }
}

/**
 * MD新規保存：保存ダイアログでファイル名を決めて保存する。
 * 開くフォルダ：今のファイルのフォルダ（無ければ設定の保存先フォルダ）
 */
export async function savePromptAs(): Promise<boolean> {
  try {
    const { filePath } = usePromptStore.getState();
    const dir = filePath ? await resolvePromptDir(await dirname(filePath)) : await settingsDir();
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

/** MD保存：今のファイルに上書き保存する（保存先が無ければ新規保存＝Ctrl+S 用） */
export async function savePrompt(): Promise<boolean> {
  const { filePath, fileText } = usePromptStore.getState();
  if (!filePath) return savePromptAs();
  try {
    if (!(await confirmIfChanged(filePath, fileText))) return false;
    await writeDoc(filePath);
    return true;
  } catch (e) {
    await showError("上書き保存に失敗しました", e);
    return false;
  }
}
