import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { confirmDialog } from "../../lib/confirm";
import { usePromptStore } from "../../stores/promptStore";
import type { Field, FormatOptions, Lang, Part, PromptSet, Separator } from "../../types";

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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: set.id });
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
      className={`set-row${isDragging ? " is-dragging" : ""}`}
    >
      <div className="set-row__bar">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label="ドラッグで並べ替え"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <span className="set-row__no">#{index + 1}</span>
        <button type="button" disabled title="M4で実装予定">日→英</button>
        <button type="button" disabled title="M4で実装予定">英→日</button>
        <div className="spacer" />
        <button type="button" onClick={() => rerollSet(set.id)} title="このセットを再抽選">
          🎲
        </button>
        <button type="button" className="danger" onClick={handleRemove}>
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

      <FieldRow setId={set.id} part="heading" label="見出し" field={set.heading} />
      <FieldRow setId={set.id} part="content" label="内容" field={set.content} multiline />
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

type FieldRowProps = { setId: string; part: Part; label: string; field: Field; multiline?: boolean };

function FieldRow({ setId, part, label, field, multiline }: FieldRowProps) {
  const updateText = usePromptStore((s) => s.updateText);
  const toggleOutput = usePromptStore((s) => s.toggleOutput);

  const box = (lang: Lang) => {
    const common = {
      value: field[lang],
      placeholder: lang === "ja" ? `${label}（日本語）` : `${label} (English)`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        updateText(setId, part, lang, e.target.value),
    };
    return multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />;
  };

  return (
    <div className="field-row">
      <label className="field-row__label" title="最終プロンプトに出力する">
        <input type="checkbox" checked={field.output} onChange={() => toggleOutput(setId, part)} />
        {label}
      </label>
      {box("ja")}
      {box("en")}
    </div>
  );
}
