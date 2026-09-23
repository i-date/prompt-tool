import { useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { confirmDialog } from "../../lib/confirm";
import { selectIsDirty, usePromptStore } from "../../stores/promptStore";
import type { FormatMode, Separator } from "../../types";
import { importPrompt, savePrompt, savePromptAs } from "./fileActions";
import { OutputPanel } from "./OutputPanel";
import { SetRow } from "./SetRow";

const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

export function PromptEditorPage() {
  const doc = usePromptStore((s) => s.doc);
  const picks = usePromptStore((s) => s.picks);
  const filePath = usePromptStore((s) => s.filePath);
  const isDirty = usePromptStore(selectIsDirty);
  const { addSet, moveSet, setFormatMode, setGlobalFormat, rerollAll, resetDoc } =
    usePromptStore.getState(); // アクションは不変なので getState で取得

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2000);
    return () => clearTimeout(t);
  }, [notice]);

  const runSave = async (fn: () => Promise<boolean>) => {
    if (await fn()) setNotice("✓ 保存しました");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) moveSet(String(active.id), String(over.id));
  };

  const handleNew = async () => {
    if (isDirty && !(await confirmDialog("保存していない変更があります。破棄して新規作成しますか？")))
      return;
    resetDoc();
  };

  const perSet = doc.formatMode === "perSet";
  const prefix = perSet ? "既定の" : "";

  return (
    <div>
      <div className="toolbar">
        <button type="button" onClick={() => void handleNew()}>新規作成</button>
        <button type="button" onClick={() => void importPrompt()}>取り込み</button>
        <button type="button" onClick={() => void runSave(savePromptAs)} title="名前を付けて新しいファイルに保存">
          MD新規保存
        </button>
        <button
          type="button"
          onClick={() => void runSave(savePrompt)}
          title={filePath ? `上書き保存：${filePath}` : "保存先が未設定のため、新規保存になります"}
        >
          MD保存
        </button>
        <span className="file-name" title={filePath ?? ""}>
          {filePath ? baseName(filePath) : "（新規）"}
        </span>
        {notice ? (
          <span className="notice">{notice}</span>
        ) : (
          isDirty && <span className="dirty">● 未保存</span>
        )}
        <div className="spacer" />
        <button type="button" onClick={rerollAll} title="すべての [A / B] を再抽選">
          🎲 全体再抽選
        </button>
      </div>

      <div className="toolbar toolbar--format">
        <label>
          書式の指定
          <select
            value={doc.formatMode}
            onChange={(e) => setFormatMode(e.target.value as FormatMode)}
          >
            <option value="global">全体で1つ</option>
            <option value="perSet">セットごと</option>
          </select>
        </label>
        <label>
          {prefix}区切り
          <select
            value={doc.format.separator}
            onChange={(e) => setGlobalFormat({ separator: e.target.value as Separator })}
          >
            <option value="newline">改行</option>
            <option value="comma">カンマ</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={doc.format.blankAfterHeading}
            onChange={(e) => setGlobalFormat({ blankAfterHeading: e.target.checked })}
          />
          {prefix}見出し後に空行
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={doc.format.blankAfterSection}
            onChange={(e) => setGlobalFormat({ blankAfterSection: e.target.checked })}
          />
          {prefix}セクション後に空行
        </label>
      </div>
      <p className="hint">
        ※ 見出しのあるセットの前と、見出しだけのセットの後は、区切りの設定にかかわらず改行されます。
      </p>

      <div className="field-row field-row--head">
        <span>出力</span>
        <span>日本語</span>
        <span>English</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={doc.sets.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="set-list">
            {doc.sets.map((set, i) => (
              <SetRow
                key={set.id}
                set={set}
                index={i}
                isLast={i === doc.sets.length - 1}
                perSet={perSet}
                globalFormat={doc.format}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button type="button" className="add-set" onClick={addSet}>＋ セットを追加</button>

      <OutputPanel doc={doc} picks={picks} />
    </div>
  );
}
