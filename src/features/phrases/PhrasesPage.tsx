import { useEffect, useMemo } from "react";
import { allTags, filterPhrases, isFilterActive, UNCATEGORIZED } from "../../lib/phrases/search";
import { nextSort, sortPhrases } from "../../lib/phrases/sort";
import { norm } from "../../lib/phrases/text";
import { useEnsurePhrasesLoaded, usePhraseStore } from "../../stores/phraseStore";
import { usePhraseViewStore } from "../../stores/phraseViewStore";
import { InsertTargetBar } from "./InsertTargetBar";
import { PhraseForm } from "./PhraseForm";
import { PhraseTable } from "./PhraseTable";
import { TransferMenu } from "./TransferMenu";

export function PhrasesPage() {
  useEnsurePhrasesLoaded();
  const data = usePhraseStore((s) => s.data);
  const status = usePhraseStore((s) => s.status);
  const message = usePhraseStore((s) => s.message);
  const dismissMessage = usePhraseStore((s) => s.dismissMessage);

  const filter = usePhraseViewStore((s) => s.filter);
  const sort = usePhraseViewStore((s) => s.sort);
  const setFilter = usePhraseViewStore((s) => s.setFilter);
  const resetFilter = usePhraseViewStore((s) => s.resetFilter);
  const setSort = usePhraseViewStore((s) => s.setSort);

  const rows = useMemo(() => sortPhrases(filterPhrases(data, filter), sort, data.categories), [data, filter, sort]);
  const tags = useMemo(() => allTags(data), [data]);
  const editable = status === "ready";
  const canDrag = editable && sort === null && !isFilterActive(filter);

  // 保持中の絞り込み対象（カテゴリ・タグ）が削除されていたら、その条件だけ解除する
  useEffect(() => {
    if (status !== "ready") return;
    const { categoryId, tag } = filter;
    const categoryGone =
      categoryId !== "" && categoryId !== UNCATEGORIZED && !data.categories.some((c) => c.id === categoryId);
    const tagGone = tag !== "" && !tags.some((t) => norm(t) === norm(tag));
    if (categoryGone || tagGone) {
      setFilter({ ...(categoryGone ? { categoryId: "" } : {}), ...(tagGone ? { tag: "" } : {}) });
    }
  }, [status, data.categories, tags, filter, setFilter]);

  return (
    <div className="page phrases-page">
      {message && (
        <p className="banner">
          {message}{" "}
          <button type="button" className="mini" onClick={dismissMessage}>×</button>
        </p>
      )}
      {status === "loading" && <p className="hint">読み込み中…</p>}
      <PhraseForm disabled={!editable} />
      <div className="phrase-toolbar">
        <input
          type="search"
          value={filter.query}
          onChange={(e) => setFilter({ query: e.target.value })}
          placeholder="検索（日英・カテゴリ・タグ、空白で AND）"
          className="search"
        />
        <select
          value={filter.categoryId}
          onChange={(e) => setFilter({ categoryId: e.target.value })}
          aria-label="カテゴリで絞り込み"
        >
          <option value="">すべてのカテゴリ</option>
          <option value={UNCATEGORIZED}>（未分類）</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filter.tag} onChange={(e) => setFilter({ tag: e.target.value })} aria-label="タグで絞り込み">
          <option value="">すべてのタグ</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {isFilterActive(filter) && <button type="button" onClick={resetFilter}>絞り込み解除</button>}
        {sort && <button type="button" onClick={() => setSort(null)}>並び順に戻す</button>}
        <span className="count">{rows.length} / {data.phrases.length} 件</span>
        <TransferMenu />
      </div>
      <InsertTargetBar />
      <PhraseTable
        rows={rows}
        categories={data.categories}
        sort={sort}
        onSort={(k) => setSort(nextSort(sort, k))}
        canDrag={canDrag}
        editable={editable}
      />
    </div>
  );
}
