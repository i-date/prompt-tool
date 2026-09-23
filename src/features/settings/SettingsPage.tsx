import { useSettingsStore } from "../../stores/settingsStore";

export function SettingsPage() {
  const trimContent = useSettingsStore((s) => s.trimContent);
  const setTrimContent = useSettingsStore((s) => s.setTrimContent);

  return (
    <div className="settings">
      <section className="panel">
        <h2>最終プロンプト</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={trimContent}
            onChange={(e) => setTrimContent(e.target.checked)}
          />
          内容の前後の空白・改行を取り除く（トリム）
        </label>
        <p className="hint">
          OFFにすると、内容を入力したまま出力します（空白だけの内容は出力しません）。見出しと [A / B]
          の選択肢は常にトリムされます。
        </p>
        <p className="hint">※ 現在は、アプリを再起動すると初期値（ON）に戻ります。設定の保存はM4で対応します。</p>
      </section>
      <p className="placeholder">翻訳エンジン・保存先フォルダなどの設定は M4 で追加予定です。</p>
    </div>
  );
}
