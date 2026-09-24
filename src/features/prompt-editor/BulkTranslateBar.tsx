import { message } from "@tauri-apps/plugin-dialog";
import { planUndo, type UndoEntry } from "../../lib/translate/undo";
import { usePromptStore } from "../../stores/promptStore";
import { isTranslateTarget, TRANSLATE_PARTS, type TranslatePart, useTranslateTargetStore } from "../../stores/translateTargetStore";
import { useTranslateUndoStore } from "../../stores/translateUndoStore";
import type { PromptSet } from "../../types";
import { BULK_KEY, translateWithConfirm, useTranslateBusy } from "../translate/translateActions";

const PART_LABEL: Record<TranslatePart, string> = { heading: "見出し", content: "内容" };

export function BulkTranslateBar({ sets }: { sets: PromptSet[] }) {
  const busyKey = useTranslateBusy((s) => s.key);
  const off = useTranslateTargetStore((s) => s.off);
  const updateText = usePromptStore((s) => s.updateText);
  const undoLabel = useTranslateUndoStore((s) => s.label);
  const undoEntries = useTranslateUndoStore((s) => s.entries);
  const record = useTranslateUndoStore((s) => s.record);
  const clearUndo = useTranslateUndoStore((s) => s.clear);

  const targets = sets.flatMap((set, i) =>
    TRANSLATE_PARTS.filter((p) => isTranslateTarget(off, set.id, p)).map((part) => ({
      set,
      part,
      label: `#${i + 1} ${PART_LABEL[part]}`,
    })),
  );
  const canBulk = busyKey === null && targets.some((t) => t.set[t.part].ja.trim() !== "");

  const runBulk = async () => {
    const byKey = new Map(targets.map((t, i) => [String(i), t] as const));
    const applied = await translateWithConfirm({
      busyKey: BULK_KEY,
      from: "ja",
      to: "en",
      fields: targets.map((t, i) => ({ key: String(i), label: t.label, source: t.set[t.part].ja, target: t.set[t.part].en })),
      apply: (key, text) => {
        const t = byKey.get(key);
        if (t) updateText(t.set.id, t.part, "en", text);
      },
    });
    const entries: UndoEntry[] = applied.flatMap((a) => {
      const t = byKey.get(a.key);
      return t ? [{ setId: t.set.id, part: t.part, lang: "en" as const, prev: a.prev, next: a.next }] : [];
    });
    if (entries.length > 0) record("一括 日→英", entries);
  };

  const plan = planUndo(undoEntries, (e) => sets.find((s) => s.id === e.setId)?.[e.part][e.lang]);
  const runUndo = async () => {
    for (const e of plan.revert) updateText(e.setId, e.part, e.lang, e.prev);
    clearUndo();
    if (plan.skipped > 0) {
      await message(`${plan.skipped} 欄は翻訳後に編集または削除されていたため、戻しませんでした。`, {
        title: "元に戻す",
        kind: "info",
      });
    }
  };

  return (
    <span className="bulk-translate">
      <button
        type="button"
        onClick={() => void runBulk()}
        disabled={!canBulk}
        title="「翻訳」にチェックした全セットの見出し・内容を日本語→英語に翻訳"
      >
        全セット 日→英
      </button>
      {busyKey === BULK_KEY && <span className="hint">一括翻訳中…</span>}
      {busyKey === null && plan.revert.length > 0 && (
        <button type="button" className="undo-btn" onClick={() => void runUndo()} title="直前の翻訳結果を翻訳前の内容に戻す">
          ↶ 元に戻す（{undoLabel}）
        </button>
      )}
    </span>
  );
}
