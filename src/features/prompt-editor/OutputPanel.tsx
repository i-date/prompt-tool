import { useMemo } from "react";
import { buildPrompt } from "../../lib/prompt-builder";
import { useSettingsStore } from "../../stores/settingsStore";
import type { Picks, PromptDoc } from "../../types";

type Props = { doc: PromptDoc; picks: Picks };

export function OutputPanel({ doc, picks }: Props) {
  const trimContent = useSettingsStore((s) => s.trimContent);
  const ja = useMemo(() => buildPrompt(doc, picks, "ja", { trimContent }), [doc, picks, trimContent]);
  const en = useMemo(() => buildPrompt(doc, picks, "en", { trimContent }), [doc, picks, trimContent]);

  return (
    <section className="output">
      <h2>最終プロンプト</h2>
      <div className="output__grid">
        {[
          { label: "日本語", text: ja },
          { label: "English", text: en },
        ].map(({ label, text }) => (
          <div key={label} className="output__col">
            <div className="output__head">
              <span>{label}</span>
              <button
                type="button"
                disabled={!text}
                onClick={() => navigator.clipboard.writeText(text)}
              >
                コピー
              </button>
            </div>
            <textarea readOnly value={text} />
          </div>
        ))}
      </div>
    </section>
  );
}
