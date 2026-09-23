import { SortableArea } from "../../components/SortableArea";
import type { SortKey, SortState } from "../../lib/phrases/sort";
import type { Category, Phrase } from "../../lib/phrases/types";
import { usePhraseStore } from "../../stores/phraseStore";
import { PhraseRow } from "./PhraseRow";

function SortTh({ label, k, sort, onSort }: { label: string; k: SortKey; sort: SortState; onSort: (k: SortKey) => void }) {
  const dir = sort?.key === k ? sort.dir : null;
  return (
    <th aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
      <button type="button" className="th-sort" onClick={() => onSort(k)} title="クリックで 昇順 → 降順 → 解除">
        {label}<span className="sort-mark">{dir === "asc" ? "▲" : dir === "desc" ? "▼" : ""}</span>
      </button>
    </th>
  );
}

export function PhraseTable({ rows, categories, sort, onSort, canDrag, editable }: {
  rows: Phrase[];
  categories: Category[];
  sort: SortState;
  onSort: (k: SortKey) => void;
  canDrag: boolean;
  editable: boolean;
}) {
  const movePhrase = usePhraseStore((s) => s.movePhrase);
  return (
    <>
      <SortableArea ids={rows.map((r) => r.id)} onMove={movePhrase}>
        <table className="data-table phrase-table">
          <colgroup>
            <col className="col-handle" />
            <col />
            <col />
            <col className="col-category" />
            <col className="col-tags" />
            <col className="col-candidate" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th aria-label="並べ替え" />
              <SortTh label="日本語" k="ja" sort={sort} onSort={onSort} />
              <SortTh label="英語" k="en" sort={sort} onSort={onSort} />
              <SortTh label="カテゴリ" k="category" sort={sort} onSort={onSort} />
              <th>タグ</th>
              <SortTh label="候補" k="candidate" sort={sort} onSort={onSort} />
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <PhraseRow key={p.id} phrase={p} categories={categories} canDrag={canDrag} editable={editable} />
            ))}
          </tbody>
        </table>
      </SortableArea>
      {rows.length === 0 && <p className="empty">該当するフレーズはありません。</p>}
      {!canDrag && rows.length > 1 && <p className="hint">ドラッグでの並べ替えは、ソートと絞り込みを解除すると使えます。</p>}
    </>
  );
}
