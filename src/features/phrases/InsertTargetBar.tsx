import { useEffect } from "react";
import { resolveTarget } from "../../lib/phrases/insert";
import { useInsertTargetStore } from "../../stores/insertTargetStore";
import { usePromptStore } from "../../stores/promptStore";
import type { Part } from "../../types";
import { targetLabel } from "./insertPhrase";
import { headingVisible } from "../../lib/headingMode";
import { useSettingsStore } from "../../stores/settingsStore";

const PARTS: readonly Part[] = ["heading", "content"];

/** フレーズ一覧の「挿入」の挿入先を選ぶバー */
export function InsertTargetBar() {
  const sets = usePromptStore((s) => s.doc.sets);
  const target = useInsertTargetStore((s) => s.target);
  const notice = useInsertTargetStore((s) => s.notice);
  const setTarget = useInsertTargetStore((s) => s.setTarget);
  const setNotice = useInsertTargetStore((s) => s.setNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice, setNotice]);

  const allowHeading = useSettingsStore((s) => headingVisible(s.headingMode));
  const parts: readonly Part[] = allowHeading ? PARTS : ["content"];
  const resolved = resolveTarget(sets, target, { allowHeading });
  const value = resolved ? `${resolved.setId}:${resolved.part}` : "";

  return (
    <div className="insert-bar">
      <span className="insert-bar__label">挿入先</span>
      <select
        value={value}
        aria-label="挿入先"
        onChange={(e) => {
          const [setId, part] = e.target.value.split(":");
          if (setId && part) setTarget({ setId, part: part as Part });
        }}
      >
        {sets.length === 0 && <option value="">#1 内容（新しいセット）</option>}
        {sets.flatMap((s, i) => {
          const h = (s.heading.ja || s.heading.en).trim();
          const preview = h ? `（${h.length > 16 ? `${h.slice(0, 16)}…` : h}）` : "";
          return parts.map((part) => (
            <option key={`${s.id}:${part}`} value={`${s.id}:${part}`}>
              {targetLabel(i, part)}
              {preview}
            </option>
          ));
        })}
      </select>
      {notice ? (
        <span className={`insert-bar__notice ${notice.kind}`}>{notice.text}</span>
      ) : (
        <span className="hint">
          「挿入」で日本語・英語の欄の末尾に追加します（プロンプト作成で最後に入力した欄が自動で選ばれます）
        </span>
      )}
    </div>
  );
}
