import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef } from "react";
import { SuggestField } from "../../components/SuggestField";
import { useAutoResize } from "../../components/useAutoResize";
import { confirmDialog } from "../../lib/confirm";
import { headingOutput, headingVisible } from "../../lib/headingMode";
import { visibleLangs } from "../../lib/langView";
import { appendPhrase } from "../../lib/phrases/insert";
import type { SuggestItem } from "../../lib/phrases/suggest";
import { useInsertTargetStore } from "../../stores/insertTargetStore";
import { usePromptStore } from "../../stores/promptStore";
import { useSettingsStore } from "../../stores/settingsStore";
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
  const headingMode = useSettingsStore((s) => s.headingMode);
  const showHeading = headingVisible(headingMode);
  const outHeading = headingOutput(headingMode);
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

      {perSet && (outHeading || !isLast) && (
        <div className="set-row__format">
          {/* 見出しを出力しない設定のときは「見出し後の空行」は意味がないので出さない */}
          {outHeading && (
            <Override
              label="見出し後の空行"
              value={set.format?.blankAfterHeading}
              inherited={globalFormat.blankAfterHeading}
              choices={ON_OFF}
              onChange={(v) => setSetFormat(set.id, "blankAfterHeading", v)}
            />
          )}
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

      {showHeading && (
        <FieldRow
          setId={set.id}
          part="heading"
          label="見出し"
          field={set.heading}
          locked={locked}
          showTranslate={translationOn}
          muted={!outHeading}
        />
      )}
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
  /** 出力しない設定の行（灰色表示・出力チェックは操作不可。入力はできる） */
  muted?: boolean;
  multiline?: boolean;
};

type InputEl = HTMLInputElement | HTMLTextAreaElement;

function FieldRow({ setId, part, label, field, locked, showTranslate, muted = false, multiline }: FieldRowProps) {
  const updateText = usePromptStore((s) => s.updateText);
  const toggleOutput = usePromptStore((s) => s.toggleOutput);
  const translateOn = useTranslateTargetStore((s) => isTranslateTarget(s.off, setId, part));
  const setTarget = useTranslateTargetStore((s) => s.setTarget);
  const fillOther = useSettingsStore((s) => s.suggestFillOther);
  const langView = useSettingsStore((s) => s.langView);
  const langs = visibleLangs(langView);
  const setInsertTarget = useInsertTargetStore((s) => s.setTarget);

  // 複数行（内容）のときは、表示中の欄を「行数の多いほう + 1 行」の同じ高さにそろえる
  const jaRef = useRef<InputEl | null>(null);
  const enRef = useRef<InputEl | null>(null);
  useAutoResize([jaRef, enRef], `${field.ja}\u0000${field.en}`, { enabled: !!multiline, layoutKey: langView });

  /** 候補を選んだとき、もう一方の言語の欄の末尾にも訳を追加する（非表示の欄にも入る） */
  const fillOtherLang = (lang: Lang) => (item: SuggestItem) => {
    const other: Lang = lang === "ja" ? "en" : "ja";
    const current = usePromptStore.getState().doc.sets.find((s) => s.id === setId)?.[part][other];
    if (current === undefined) return;
    const r = appendPhrase(current, item.other);
    if (r.changed) updateText(setId, part, other, r.value);
  };

  const box = (lang: Lang) => (
    <SuggestField
      key={lang}
      lang={lang}
      value={field[lang]}
      readOnly={locked}
      multiline={multiline}
      autoResize={false}
      inputRef={(el) => {
        (lang === "ja" ? jaRef : enRef).current = el;
      }}
      placeholder={lang === "ja" ? `${label}（日本語）` : `${label} (English)`}
      onValueChange={(v) => updateText(setId, part, lang, v)}
      onFocus={() => setInsertTarget({ setId, part })}
      onPick={fillOther ? fillOtherLang(lang) : undefined}
    />
  );

  const cls = ["field-row", langs.length === 1 && "field-row--single", locked && "is-locked", muted && "is-muted"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <div className="field-row__checks">
        <label
          className="field-row__label"
          title={muted ? "操作エリアの「見出し」が「表示のみ（出力しない）」のため出力されません" : "最終プロンプトに出力する"}
        >
          <input
            type="checkbox"
            checked={field.output}
            onChange={() => toggleOutput(setId, part)}
            disabled={locked || muted}
          />
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
      {langs.map(box)}
    </div>
  );
}
