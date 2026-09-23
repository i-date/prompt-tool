import { ask } from "@tauri-apps/plugin-dialog";
import { type FormEvent, useState } from "react";
import { usePhraseStore } from "../../stores/phraseStore";
import { CategorySelect } from "./CategorySelect";
import { emptyDraft, fromDraft } from "./draft";

export function PhraseForm({ disabled }: { disabled: boolean }) {
  const categories = usePhraseStore((s) => s.data.categories);
  const addPhrase = usePhraseStore((s) => s.addPhrase);
  const hasDuplicate = usePhraseStore((s) => s.hasDuplicate);
  const [draft, setDraft] = useState(emptyDraft);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = fromDraft(draft);
    if (input.ja === "" && input.en === "") return;
    if (hasDuplicate(input.ja, input.en)
      && !(await ask("同じ日本語・英語のフレーズが既にあります。追加しますか？", { title: "重複", kind: "warning" }))) return;
    addPhrase(input);
    setDraft((d) => ({ ...emptyDraft, categoryId: d.categoryId, candidate: d.candidate })); // カテゴリ等は引き継ぐ
  };

  return (
    <form className="phrase-form" onSubmit={submit}>
      <input value={draft.ja} onChange={(e) => setDraft({ ...draft, ja: e.target.value })} placeholder="日本語" disabled={disabled} />
      <input value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} placeholder="English" disabled={disabled} />
      <CategorySelect value={draft.categoryId} onChange={(categoryId) => setDraft({ ...draft, categoryId })} categories={categories} disabled={disabled} />
      <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="タグ（, 区切り）" disabled={disabled} />
      <label className="nowrap">
        <input type="checkbox" checked={draft.candidate} onChange={(e) => setDraft({ ...draft, candidate: e.target.checked })} disabled={disabled} />
        候補の対象
      </label>
      <button type="submit" disabled={disabled || (draft.ja.trim() === "" && draft.en.trim() === "")}>追加</button>
      {categories.length === 0 && <span className="hint">カテゴリは「カテゴリ管理」タブで追加できます</span>}
    </form>
  );
}
