import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { showError } from "../../lib/confirm";
import { resolvePromptDir } from "../../lib/files";
import { useSettingsStore } from "../../stores/settingsStore";
import { TranslationSettings } from "./TranslationSettings";

export function SettingsPage() {
  const trimContent = useSettingsStore((s) => s.trimContent);
  const promptDir = useSettingsStore((s) => s.promptDir);
  const { setTrimContent, setPromptDir } = useSettingsStore.getState();
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    let alive = true;
    resolvePromptDir(promptDir)
      .then((d) => alive && setResolved(d))
      .catch(() => alive && setResolved(""));
    return () => {
      alive = false;
    };
  }, [promptDir]);

  const pickDir = async () => {
    try {
      const dir = await open({
        title: "保存先フォルダを選択",
        directory: true,
        multiple: false,
        defaultPath: resolved || undefined,
      });
      if (dir) await setPromptDir(dir);
    } catch (e) {
      await showError("フォルダを設定できませんでした", e);
    }
  };

  const fallback = promptDir !== null && resolved !== "" && resolved !== promptDir;

  return (
    <div className="settings">
      <section className="panel">
        <h2>保存先フォルダ</h2>
        <div className="dir-row">
          <code className="dir-path">{resolved || "（取得中…）"}</code>
          <button type="button" onClick={() => void pickDir()}>変更…</button>
          <button type="button" disabled={promptDir === null} onClick={() => void setPromptDir(null)}>
            既定に戻す
          </button>
        </div>
        <p className="hint hint--flush">
          {promptDir === null
            ? "既定のフォルダ（ドキュメント\\PromptTool）を使用しています。"
            : fallback
              ? "⚠ 指定したフォルダが見つからないため、既定のフォルダを使用しています。"
              : "取り込み・MD保存のダイアログは、このフォルダを開いた状態で表示されます。"}
        </p>
      </section>

      <section className="panel">
        <h2>最終プロンプト</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={trimContent}
            onChange={(e) => void setTrimContent(e.target.checked)}
          />
          内容の前後の空白・改行を取り除く（トリム）
        </label>
        <p className="hint">
          OFFにすると、内容を入力したまま出力します（空白だけの内容は出力しません）。見出しと [A / B]
          の選択肢は常にトリムされます。
        </p>
      </section>

      <TranslationSettings />
    </div>
  );
}
