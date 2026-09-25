import type { TransLang } from "../../lib/translate/client";
import { usePromptStore } from "../../stores/promptStore";
import { isTranslateTarget, TRANSLATE_PARTS, type TranslatePart, useTranslateTargetStore } from "../../stores/translateTargetStore";
import { useTranslateUndoStore } from "../../stores/translateUndoStore";
import type { PromptSet } from "../../types";
import { setBusyKey, translateWithConfirm, useTranslateBusy } from "../translate/translateActions";
import { headingVisible } from "../../lib/headingMode";
import { useSettingsStore } from "../../stores/settingsStore";

const PART_LABEL: Record<TranslatePart, string> = { heading: "見出し", content: "内容" };

export function SetTranslateButtons({ set, label }: { set: PromptSet; label: string }) {
  const busyKey = useTranslateBusy((s) => s.key);
  const off = useTranslateTargetStore((s) => s.off);
  const updateText = usePromptStore((s) => s.updateText);
  const record = useTranslateUndoStore((s) => s.record);
  const myKey = setBusyKey(set.id);

  const showHeading = useSettingsStore((s) => headingVisible(s.headingMode));
  const parts = TRANSLATE_PARTS.filter(
    (p) => (p !== "heading" || showHeading) && isTranslateTarget(off, set.id, p), // 非表示の見出しは翻訳しない
  );
  const hasSource = (l: TransLang) => parts.some((p) => set[p][l].trim() !== "");
  const title = (dir: string) => (parts.length === 0 ? "翻訳対象の欄がありません（行の「翻訳」をチェック）" : `翻訳対象の欄を${dir}に翻訳`);

  const run = async (from: TransLang, to: TransLang) => {
    const applied = await translateWithConfirm({
      busyKey: myKey,
      from,
      to,
      fields: parts.map((p) => ({ key: p, label: PART_LABEL[p], source: set[p][from], target: set[p][to] })),
      apply: (p, text) => updateText(set.id, p, to, text),
    });
    if (applied.length > 0) {
      record(
        `${label} ${from === "ja" ? "日→英" : "英→日"}`,
        applied.map((a) => ({ setId: set.id, part: a.key, lang: to, prev: a.prev, next: a.next })),
      );
    }
  };

  return (
    <span className="translate-buttons">
      <button type="button" onClick={() => void run("ja", "en")} disabled={busyKey !== null || !hasSource("ja")} title={title("日本語→英語")}>
        日→英
      </button>
      <button type="button" onClick={() => void run("en", "ja")} disabled={busyKey !== null || !hasSource("en")} title={title("英語→日本語")}>
        英→日
      </button>
      {busyKey === myKey && <span className="hint">翻訳中…</span>}
    </span>
  );
}
