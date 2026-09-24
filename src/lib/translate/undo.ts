export type UndoEntry = {
  setId: string;
  part: "heading" | "content";
  lang: "ja" | "en";
  prev: string;
  next: string;
};
export type UndoPlan = { revert: UndoEntry[]; skipped: number };

/** 翻訳結果のまま残っている欄だけ戻す（手で編集した欄・削除されたセットは戻さない） */
export function planUndo(entries: UndoEntry[], current: (e: UndoEntry) => string | undefined): UndoPlan {
  const revert = entries.filter((e) => current(e) === e.next);
  return { revert, skipped: entries.length - revert.length };
}
