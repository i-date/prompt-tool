import { invoke } from "@tauri-apps/api/core";
import { ask, message as showMessage, open, save } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { serializePhraseData } from "../../lib/phrases/schema";
import { csvToPayload, type ImportMode, jsonToPayload, phrasesToCsv } from "../../lib/phrases/transfer";
import { usePhraseStore } from "../../stores/phraseStore";

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

export function TransferMenu() {
  const status = usePhraseStore((s) => s.status);
  const importPayload = usePhraseStore((s) => s.importPayload);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      await showMessage(String(e instanceof Error ? e.message : e), { title: "エラー", kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  const exportAs = (kind: "json" | "csv") => run(async () => {
    const data = usePhraseStore.getState().data;
    const path = await save({
      defaultPath: `phrases-${stamp()}.${kind}`,
      filters: [kind === "json" ? { name: "JSON", extensions: ["json"] } : { name: "CSV (UTF-8)", extensions: ["csv"] }],
    });
    if (!path) return;
    const contents = kind === "json" ? serializePhraseData(data) : phrasesToCsv(data);
    await invoke("export_text_file", { path, contents, bom: kind === "csv" }); // CSV は Excel 向けに BOM 付き
    await showMessage(`${data.phrases.length} 件を書き出しました。\n${path}`, { title: "エクスポート", kind: "info" });
  });

  const importFile = () => run(async () => {
    const path = await open({ multiple: false, directory: false, filters: [{ name: "フレーズ (JSON / CSV)", extensions: ["json", "csv"] }] });
    if (typeof path !== "string") return;
    const isCsv = path.toLowerCase().endsWith(".csv");
    let text: string;
    try {
      text = await invoke<string>("import_text_file", { path });
    } catch (e) {
      throw new Error(`${String(e)}${isCsv ? "\nExcel では「CSV UTF-8（コンマ区切り）」で保存してください。" : ""}`);
    }
    const payload = isCsv ? csvToPayload(text) : jsonToPayload(text);
    if (mode === "replace") {
      const n = usePhraseStore.getState().data.phrases.length;
      const ok = await ask(
        `現在のフレーズ ${n} 件とカテゴリをすべて消し、ファイルの ${payload.phrases.length} 件で置き換えます。\n（事前に JSON エクスポートしておくと安全です）`,
        { title: "置き換えの確認", kind: "warning", okLabel: "置き換える", cancelLabel: "中止" },
      );
      if (!ok) return;
    }
    const r = importPayload(payload, mode);
    if (!r) throw new Error("現在は編集できない状態のため取り込めません");
    await showMessage(`追加 ${r.added} 件 / 重複スキップ ${r.skipped} 件 / 新規カテゴリ ${r.categoriesAdded} 件`, { title: "取り込み完了", kind: "info" });
  });

  const disabled = busy || status !== "ready";
  return (
    <div className="transfer-menu">
      <button type="button" onClick={() => void exportAs("json")} disabled={disabled}>JSON 書き出し</button>
      <button type="button" onClick={() => void exportAs("csv")} disabled={disabled}>CSV 書き出し</button>
      <select value={mode} onChange={(e) => setMode(e.target.value as ImportMode)} disabled={disabled} aria-label="取り込み方法">
        <option value="merge">追加（重複スキップ）</option>
        <option value="replace">置き換え</option>
      </select>
      <button type="button" onClick={() => void importFile()} disabled={disabled}>取り込み…</button>
    </div>
  );
}
