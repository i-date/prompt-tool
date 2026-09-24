import { describe, expect, it } from "vitest";
import { planUndo, type UndoEntry } from "./undo";

const e = (part: UndoEntry["part"], prev: string, next: string, setId = "s1"): UndoEntry =>
  ({ setId, part, lang: "en", prev, next });

describe("planUndo", () => {
  it("翻訳後に手で編集された欄は戻さない", () => {
    const entries = [e("heading", "old", "new"), e("content", "", "text")];
    const plan = planUndo(entries, (x) => (x.part === "heading" ? "new" : "edited"));
    expect(plan.revert).toEqual([entries[0]]);
    expect(plan.skipped).toBe(1);
  });
  it("削除されたセット（現在値なし）は戻さない", () => {
    expect(planUndo([e("heading", "a", "b", "gone")], () => undefined)).toEqual({ revert: [], skipped: 1 });
  });
});
