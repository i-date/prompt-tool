import { ask } from "@tauri-apps/plugin-dialog";
import { type KeyboardEvent, useState } from "react";
import { SortableTr } from "../../components/SortableArea";
import { type Category, type Phrase, isEffectiveCandidate } from "../../lib/phrases/types";
import { usePhraseStore } from "../../stores/phraseStore";
import { translateWithConfirm, useTranslateBusy } from "../translate/translateActions";
import { CategorySelect } from "./CategorySelect";
import { type PhraseDraft, fromDraft, toDraft } from "./draft";

export function PhraseRow({ phrase, categories, canDrag, editable }: {
  phrase: Phrase;
  categories: Category[];
  canDrag: boolean;
  editable: boolean;
}) {
  const updatePhrase = usePhraseStore((s) => s.updatePhrase);
  const deletePhrase = usePhraseStore((s) => s.deletePhrase);
  const hasDuplicate = usePhraseStore((s) => s.hasDuplicate);
  const busyKey = useTranslateBusy((s) => s.key);
  const [draft, setDraft] = useState<PhraseDraft | null>(null);
  const category = categories.find((c) => c.id === phrase.categoryId);
  const active = isEffectiveCandidate(phrase, categories);
  const myKey = `phrase:${phrase.id}`;

  const translateDraft = (from: "ja" | "en", to: "ja" | "en") => {
    if (!draft) return;
    void translateWithConfirm({
      busyKey: myKey,
      from,
      to,
      fields: [{ key: to, label: to === "ja" ? "日本語" : "英語", source: draft[from], target: draft[to] }],
      apply: (_key, text) => setDraft((d) => (d ? { ...d, [to]: text } : d)), // 編集取消済みなら何もしない
    });
  };

  const save = async () => {
    if (!draft) return;
    const input = fromDraft(draft);
    if (input.ja === "" && input.en === "") return;
    if (hasDuplicate(input.ja, input.en, phrase.id)
      && !(await ask("同じ日本語・英語のフレーズが既にあります。保存しますか？", { title: "重複", kind: "warning" }))) return;
    updatePhrase(phrase.id, input);
    setDraft(null);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(null);
    }
  };
  const remove = async () => {
    if (await ask(`「${phrase.ja || phrase.en}」を削除しますか？`, { title: "フレーズ削除", kind: "warning" })) {
      deletePhrase(phrase.id);
    }
  };

  return (
    <SortableTr id={phrase.id} disabled={!canDrag || draft !== null}>
      {(handle) =>
        draft ? (
          <>
            <td>{handle}</td>
            <td>
              <input value={draft.ja} onChange={(e) => setDraft({ ...draft, ja: e.target.value })} onKeyDown={onKeyDown} autoFocus />
              <button type="button" className="mini" onClick={() => translateDraft("en", "ja")} disabled={busyKey !== null || draft.en.trim() === ""}>
                英→日
              </button>
              {busyKey === myKey && <span className="hint"> 翻訳中…</span>}
            </td>
            <td>
              <input value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} onKeyDown={onKeyDown} />
              <button type="button" className="mini" onClick={() => translateDraft("ja", "en")} disabled={busyKey !== null || draft.ja.trim() === ""}>
                日→英
              </button>
            </td>
            <td><CategorySelect value={draft.categoryId} onChange={(categoryId) => setDraft({ ...draft, categoryId })} categories={categories} /></td>
            <td><input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} onKeyDown={onKeyDown} placeholder=", 区切り" /></td>
            <td className="cell-candidate">
              <label>
                <input type="checkbox" checked={draft.candidate} onChange={(e) => setDraft({ ...draft, candidate: e.target.checked })} />
                対象
              </label>
            </td>
            <td className="cell-actions">
              <button type="button" onClick={() => void save()} disabled={busyKey === myKey}>保存</button>
              <button type="button" onClick={() => setDraft(null)}>取消</button>
            </td>
          </>
        ) : (
          <>
            <td>{handle}</td>
            <td className="cell-text">{phrase.ja}</td>
            <td className="cell-text">{phrase.en}</td>
            <td className="cell-ellipsis" title={category?.name}>{category?.name ?? <span className="muted">未分類</span>}</td>
            <td className="cell-ellipsis" title={phrase.tags.join(", ")}>
              {phrase.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
            </td>
            <td className="cell-candidate">
              <label title="フレーズ自体の候補フラグ">
                <input type="checkbox" checked={phrase.candidate} disabled={!editable}
                  onChange={(e) => updatePhrase(phrase.id, { candidate: e.target.checked })} />
                <span className={`badge ${active ? "on" : phrase.candidate ? "cat-off" : "off"}`}>
                  {active ? "対象" : phrase.candidate ? "カテゴリOFF" : "対象外"}
                </span>
              </label>
            </td>
            <td className="cell-actions">
              <button type="button" onClick={() => setDraft(toDraft(phrase))} disabled={!editable}>編集</button>
              <button type="button" className="danger" onClick={() => void remove()} disabled={!editable}>削除</button>
            </td>
          </>
        )
      }
    </SortableTr>
  );
}
