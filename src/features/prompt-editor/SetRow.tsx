import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { confirmDialog } from "../../lib/confirm";
import { usePromptStore } from "../../stores/promptStore";
import { isTranslateTarget, useTranslateTargetStore } from "../../stores/translateTargetStore";
import { useTranslationEnabled } from "../../stores/translationSettingsStore";
import type { Field, FormatOptions, Lang, Part, PromptSet, Separator } from "../../types";
import { BULK_KEY, setBusyKey, useTranslateBusy } from "../translate/translateActions";
import { SetTranslateButtons } from "./SetTranslateButtons";

type Props = {
  set: PromptSet;
  index: number;
  isLast: boolean;
  perSet: boolean;
  globalFormat: FormatOptions;
};

type Choice<T> = { value: T; label: string };
const ON_OFF: readonly Choice<boolean>[] = [
  { value: true, label: "あり" },
  { value: false, label: "なし" },
];
const SEPS: readonly Choice<Separator>[] = [
  { value: "newline", label: "改行" },
  { value: "comma", label: "カンマ" },
];

export function SetRow({ set, index, isLast, perSet, globalFormat }: Props) {
  const translationOn = useTranslationEnabled();
  const busyKey = useTranslateBusy((s) => s.key);
  const locked = busyKey === BULK_KEY || busyKey === setBusyKey(set.id); // 翻訳中は読み取り専用
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: set.id, disabled: locked });
  const removeSet = usePromptStore((s) => s.removeSet);
  const rerollSet = usePromptStore((s) => s.rerollSet);
  const setSetFormat = usePromptStore((s) => s.setSetFormat);

  const handleRemove = async () => {
    const isEmpty = [set.heading.ja, set.heading.en, set.content.ja, set.content.en].every((v) => !v);
    if (isEmpty || (await confirmDialog(`セット #${index + 1} を削除しますか？`))) removeSet(set.id);
  };

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`set-row${isDragging ? " is-dragging" : ""}${locked ? " is-locked" : ""}`}
      aria-busy={locked}
    >
      <div className="set-row__bar">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label="ドラッグで並べ替え"
          disabled={locked}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <span className="set-row__no">#{index + 1}</span>
        {translationOn && <SetTranslateButtons set={set} label={`#${index + 1}`} />}
        <div className="spacer" />
        <button type="button" onClick={() => rerollSet(set.id)} title="このセットを再抽選">
          🎲
        </button>
        <button type="button" className="danger" onClick={handleRemove} disabled={locked}>
          削除
        </button>
      </div>

      {perSet && (
        <div className="set-row__format">
          <Override
            label="見出し後の空行"
            value={set.format?.blankAfterHeading}
            inherited={globalFormat.blankAfterHeading}
            choices={ON_OFF}
            onChange={(v) => setSetFormat(set.id, "blankAfterHeading", v)}
          />
          {!isLast && (
            <>
              <Override
                label="次との区切り"
                value={set.format?.separator}
                inherited={globalFormat.separator}
                choices={SEPS}
                onChange={(v) => setSetFormat(set.id, "separator", v)}
              />
              <Override
                label="セクション後の空行"
                value={set.format?.blankAfterSection}
                inherited={globalFormat.blankAfterSection}
                choices={ON_OFF}
                onChange={(v) => setSetFormat(set.id, "blankAfterSection", v)}
              />
            </>
          )}
        </div>
      )}

      <FieldRow setId={set.id} part="heading" label="見出し" field={set.heading} locked={locked} showTranslate={translationOn} />
      <FieldRow setId={set.id} part="content" label="内容" field={set.content} locked={locked} showTranslate={translationOn} multiline />
    </section>
  );
}

/** 「既定（全体の設定に従う）」を含む個別指定用セレクト */
function Override<T extends string | boolean>(props: {
  label: string;
  value: T | undefined;
  inherited: T;
  choices: readonly Choice<T>[];
  onChange: (v: T | undefined) => void;
}) {
  const { label, value, inherited, choices, onChange } = props;
  const selected = value === undefined ? -1 : choices.findIndex((c) => c.value === value);
  const inheritedLabel = choices.find((c) => c.value === inherited)?.label ?? "";
  return (
    <label>
      {label}
      <select
        value={selected}
        onChange={(e) => {
          const i = Number(e.target.value);
          onChange(i < 0 ? undefined : choices[i].value);
        }}
      >
        <option value={-1}>既定（{inheritedLabel}）</option>
        {choices.map((c, i) => (
          <option key={c.label} value={i}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type FieldRowProps = {
  setId: string;
  part: Part;
  label: string;
  field: Field;
  locked: boolean;
  /** 「翻訳」チェックを表示するか（翻訳機能が無効なら false） */
  showTranslate: boolean;
  multiline?: boolean;
};

function FieldRow({ setId, part, label, field, locked, showTranslate, multiline }: FieldRowProps) {
  const updateText = usePromptStore((s) => s.updateText);
  const toggleOutput = usePromptStore((s) => s.toggleOutput);
  const translateOn = useTranslateTargetStore((s) => isTranslateTarget(s.off, setId, part));
  const setTarget = useTranslateTargetStore((s) => s.setTarget);

  const box = (lang: Lang) => {
    const common = {
      value: field[lang],
      readOnly: locked,
      placeholder: lang === "ja" ? `${label}（日本語）` : `${label} (English)`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        updateText(setId, part, lang, e.target.value),
    };
    return multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />;
  };

  return (
    <div className={`field-row${locked ? " is-locked" : ""}`}>
      <div className="field-row__checks">
        <label className="field-row__label" title="最終プロンプトに出力する">
          <input type="checkbox" checked={field.output} onChange={() => toggleOutput(setId, part)} disabled={locked} />
          {label}
        </label>
        {showTranslate && (
          <label className="field-row__sub" title="翻訳ボタン・一括翻訳の対象にする">
            <input
              type="checkbox"
              checked={translateOn}
              onChange={(e) => setTarget(setId, part, e.target.checked)}
              disabled={locked}
            />
            翻訳
          </label>
        )}
      </div>
      {box("ja")}
      {box("en")}
    </div>
  );
}
