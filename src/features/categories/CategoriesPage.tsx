import { type FormEvent, useMemo, useState } from "react";
import { SortableArea } from "../../components/SortableArea";
import { useEnsurePhrasesLoaded, usePhraseStore } from "../../stores/phraseStore";
import { CategoryRow } from "./CategoryRow";

export function CategoriesPage() {
  useEnsurePhrasesLoaded();
  const categories = usePhraseStore((s) => s.data.categories);
  const phrases = usePhraseStore((s) => s.data.phrases);
  const status = usePhraseStore((s) => s.status);
  const message = usePhraseStore((s) => s.message);
  const addCategory = usePhraseStore((s) => s.addCategory);
  const moveCategory = usePhraseStore((s) => s.moveCategory);
  const [name, setName] = useState("");
  const [candidate, setCandidate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editable = status === "ready";

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of phrases) if (p.categoryId) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [phrases]);
  const uncategorized = phrases.filter((p) => p.categoryId === null).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = addCategory(name, candidate);
    setError(err);
    if (!err) setName("");
  };

  return (
    <div className="page categories-page">
      {message && <p className="banner">{message}</p>}
      <form className="category-form" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="新しいカテゴリ名" disabled={!editable} />
        <label className="nowrap">
          <input type="checkbox" checked={candidate} onChange={(e) => setCandidate(e.target.checked)} disabled={!editable} />
          候補の対象
        </label>
        <button type="submit" disabled={!editable || name.trim() === ""}>追加</button>
        {error && <span className="error">{error}</span>}
      </form>
      <SortableArea ids={categories.map((c) => c.id)} onMove={moveCategory}>
        <table className="data-table category-table">
          <colgroup>
            <col className="col-handle" />
            <col />
            <col className="col-candidate" />
            <col className="col-count" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr><th aria-label="並べ替え" /><th>カテゴリ名</th><th>候補の対象</th><th>フレーズ数</th><th>操作</th></tr>
          </thead>
          <tbody>
            {categories.map((c) => <CategoryRow key={c.id} category={c} count={counts.get(c.id) ?? 0} editable={editable} />)}
          </tbody>
        </table>
      </SortableArea>
      {categories.length === 0 && <p className="empty">カテゴリはまだありません。</p>}
      <p className="hint">
        未分類のフレーズ: {uncategorized} 件。「候補の対象」を OFF にしたカテゴリのフレーズは、プロンプト作成画面の候補に出ません（M5 で使用）。
      </p>
    </div>
  );
}
