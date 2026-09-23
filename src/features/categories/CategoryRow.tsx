import { ask } from "@tauri-apps/plugin-dialog";
import { type KeyboardEvent, useState } from "react";
import { SortableTr } from "../../components/SortableArea";
import type { Category } from "../../lib/phrases/types";
import { usePhraseStore } from "../../stores/phraseStore";

export function CategoryRow({ category, count, editable }: { category: Category; count: number; editable: boolean }) {
  const rename = usePhraseStore((s) => s.renameCategory);
  const setCandidate = usePhraseStore((s) => s.setCategoryCandidate);
  const remove = usePhraseStore((s) => s.deleteCategory);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (name === null) return;
    const err = rename(category.id, name);
    if (err) {
      setError(err);
      return;
    }
    setName(null);
    setError(null);
  };
  const cancel = () => {
    setName(null);
    setError(null);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };
  const del = async () => {
    const msg = count > 0
      ? `カテゴリ「${category.name}」を削除します。所属する ${count} 件のフレーズは未分類になります。`
      : `カテゴリ「${category.name}」を削除しますか？`;
    if (await ask(msg, { title: "カテゴリ削除", kind: "warning" })) remove(category.id);
  };

  return (
    <SortableTr id={category.id} disabled={!editable || name !== null}>
      {(handle) => (
        <>
          <td>{handle}</td>
          <td className="cell-ellipsis">
            {name === null ? category.name : (
              <>
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKeyDown} autoFocus />
                {error && <span className="error">{error}</span>}
              </>
            )}
          </td>
          <td className="cell-candidate">
            <label>
              <input type="checkbox" checked={category.candidate} disabled={!editable}
                onChange={(e) => setCandidate(category.id, e.target.checked)} />
              <span className={`badge ${category.candidate ? "on" : "off"}`}>{category.candidate ? "対象" : "対象外"}</span>
            </label>
          </td>
          <td className="cell-num">{count}</td>
          <td className="cell-actions">
            {name === null ? (
              <>
                <button type="button" onClick={() => setName(category.name)} disabled={!editable}>名前変更</button>
                <button type="button" className="danger" onClick={() => void del()} disabled={!editable}>削除</button>
              </>
            ) : (
              <>
                <button type="button" onClick={save}>保存</button>
                <button type="button" onClick={cancel}>取消</button>
              </>
            )}
          </td>
        </>
      )}
    </SortableTr>
  );
}
