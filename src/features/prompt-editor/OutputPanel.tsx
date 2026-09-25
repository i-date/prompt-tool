import { type Ref, useMemo, useRef } from "react";
import { useAutoResize } from "../../components/useAutoResize";
import { LANG_LABEL, visibleLangs } from "../../lib/langView";
import { buildPrompt } from "../../lib/prompt-builder";
import { usePromptStore } from "../../stores/promptStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { Picks, PromptDoc } from "../../types";
import { headingOutput } from "../../lib/headingMode";

type Props = {
  doc: PromptDoc;
  picks: Picks;
  /** プロンプト作成画面で翻訳中か（true のあいだは再抽選できない） */
  translating: boolean;
};

export function OutputPanel({ doc, picks, translating }: Props) {
  const trimContent = useSettingsStore((s) => s.trimContent);
  const langView = useSettingsStore((s) => s.langView);
  const langs = visibleLangs(langView);
  const rerollAll = usePromptStore((s) => s.rerollAll);
    const headings = useSettingsStore((s) => headingOutput(s.headingMode));
  const ja = useMemo(() => buildPrompt(doc, picks, "ja", { trimContent, headings }), [doc, picks, trimContent, headings]);
  const en = useMemo(() => buildPrompt(doc, picks, "en", { trimContent, headings }), [doc, picks, trimContent, headings]);
  const texts = { ja, en };

  // 表示中の欄を「行数の多いほう + 1 行」の同じ高さにそろえる
  const jaRef = useRef<HTMLTextAreaElement | null>(null);
  const enRef = useRef<HTMLTextAreaElement | null>(null);
  const refs = { ja: jaRef, en: enRef };
  useAutoResize([jaRef, enRef], `${ja}\u0000${en}`, { layoutKey: langView });

  return (
    <section className="output">
      <div className="output__title">
        <h2>出力プロンプト</h2>
        {/* 各セットの 🎲 と同じデザイン */}
        <button
          type="button"
          onClick={rerollAll}
          disabled={translating}
          title={translating ? "翻訳中は操作できません" : "すべての [A / B] を再抽選"}
          aria-label="すべて再抽選"
        >
          🎲 すべて再抽選
        </button>
      </div>
      <div className={`output__grid${langs.length === 1 ? " output__grid--single" : ""}`}>
        {langs.map((lang) => (
          <OutputColumn key={lang} label={LANG_LABEL[lang]} text={texts[lang]} textareaRef={refs[lang]} />
        ))}
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
