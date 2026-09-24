import { type Ref, useMemo, useRef } from "react";
import { useAutoResize } from "../../components/useAutoResize";
import { buildPrompt } from "../../lib/prompt-builder";
import { useSettingsStore } from "../../stores/settingsStore";
import type { Picks, PromptDoc } from "../../types";

type Props = { doc: PromptDoc; picks: Picks };

export function OutputPanel({ doc, picks }: Props) {
  const trimContent = useSettingsStore((s) => s.trimContent);
  const ja = useMemo(() => buildPrompt(doc, picks, "ja", { trimContent }), [doc, picks, trimContent]);
  const en = useMemo(() => buildPrompt(doc, picks, "en", { trimContent }), [doc, picks, trimContent]);

  // 日英 2 欄を「行数の多いほう + 1 行」の同じ高さにそろえる
  const jaRef = useRef<HTMLTextAreaElement | null>(null);
  const enRef = useRef<HTMLTextAreaElement | null>(null);
  useAutoResize([jaRef, enRef], `${ja}\u0000${en}`);

  return (
    <section className="output">
      <h2>最終プロンプト</h2>
      <div className="output__grid">
        <OutputColumn label="日本語" text={ja} textareaRef={jaRef} />
        <OutputColumn label="English" text={en} textareaRef={enRef} />
      </div>
    </section>
  );
}

type ColumnProps = { label: string; text: string; textareaRef: Ref<HTMLTextAreaElement> };

function OutputColumn({ label, text, textareaRef }: ColumnProps) {
  return (
    <div className="output__col">
      <div className="output__head">
        <span>{label}</span>
        <button type="button" disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>
          コピー
        </button>
      </div>
      <textarea ref={textareaRef} rows={1} className="autosize" readOnly value={text} />
    </div>
  );
}
