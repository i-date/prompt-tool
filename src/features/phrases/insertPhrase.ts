import { appendPhrase, resolveTarget } from "../../lib/phrases/insert";
import type { Phrase } from "../../lib/phrases/types";
import { useInsertTargetStore } from "../../stores/insertTargetStore";
import { usePromptStore } from "../../stores/promptStore";
import type { Part } from "../../types";
import { BULK_KEY, setBusyKey, useTranslateBusy } from "../translate/translateActions";

export const targetLabel = (index: number, part: Part): string =>
  `#${index + 1} ${part === "heading" ? "見出し" : "内容"}`;

/** フレーズの日本語・英語を、挿入先の欄の末尾にそれぞれ追加する */
export function insertPhraseIntoPrompt(p: Pick<Phrase, "ja" | "en">): void {
  if (usePromptStore.getState().doc.sets.length === 0) usePromptStore.getState().addSet();
  const sets = usePromptStore.getState().doc.sets;
  const { target, setTarget, setNotice } = useInsertTargetStore.getState();
  const t = resolveTarget(sets, target);
  if (!t) return;
  const label = targetLabel(t.index, t.part);

  const busy = useTranslateBusy.getState().key;
  if (busy === BULK_KEY || busy === setBusyKey(t.setId)) {
    setNotice({ kind: "warn", text: `${label} は翻訳中のため挿入できません` });
    return;
  }

  const field = sets[t.index][t.part];
  const added: string[] = [];
  let skipped = false;
  for (const lang of ["ja", "en"] as const) {
    if (p[lang].trim() === "") continue;
    const r = appendPhrase(field[lang], p[lang]);
    if (r.changed) {
      usePromptStore.getState().updateText(t.setId, t.part, lang, r.value);
      added.push(lang === "ja" ? "日本語" : "英語");
    } else {
      skipped = true;
    }
  }
  setTarget({ setId: t.setId, part: t.part });
  setNotice(
    added.length > 0
      ? { kind: "ok", text: `✓ ${label} の${added.join("・")}に挿入しました${skipped ? "（入力済みの側は省略）" : ""}` }
      : { kind: "warn", text: `${label} には既に入力されています` },
  );
}
