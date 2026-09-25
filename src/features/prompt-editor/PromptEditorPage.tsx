import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";
import { confirmDialog } from "../../lib/confirm";
import { baseName } from "../../lib/files";
import { LANG_LABEL, LANG_VIEWS, type LangView, visibleLangs } from "../../lib/langView";
import { selectIsDirty, usePromptStore } from "../../stores/promptStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTranslateUndoStore } from "../../stores/translateUndoStore";
import { useTranslationEnabled } from "../../stores/translationSettingsStore";
import type { FormatMode, Separator } from "../../types";
import { BULK_KEY, useTranslateBusy } from "../translate/translateActions";
import { BulkTranslateBar } from "./BulkTranslateBar";
import { importPrompt, savePrompt, savePromptAs } from "./fileActions";
import { OutputPanel } from "./OutputPanel";
import { SetRow } from "./SetRow";
import { useSaveShortcuts } from "./useSaveShortcuts";
import { InfoTip } from "../../components/InfoTip";
import { HEADING_MODES, type HeadingMode, headingOutput } from "../../lib/headingMode";

/** プロンプト作成画面の翻訳（一括 or セット単位）が実行中か。フレーズ管理の翻訳は含めない */
const isPromptTranslating = (key: string | null): boolean =>
  key === BULK_KEY || (key?.startsWith("set:") ?? false);

export function PromptEditorPage() {
  const doc = usePromptStore((s) => s.doc);
  const picks = usePromptStore((s) => s.picks);
  const filePath = usePromptStore((s) => s.filePath);
  const isDirty = usePromptStore(selectIsDirty);
  const { addSet, moveSet, setFormatMode, setGlobalFormat, resetDoc } =
    usePromptStore.getState(); // アクションは不変なので getState で取得

  const langView = useSettingsStore((s) => s.langView);
  const setLangView = useSettingsStore((s) => s.setLangView);
  const langs = visibleLangs(langView);
  const headingMode = useSettingsStore((s) => s.headingMode);
  const setHeadingMode = useSettingsStore((s) => s.setHeadingMode);
  const outHeading = headingOutput(headingMode);

  const translationOn = useTranslationEnabled();
  const translating = useTranslateBusy((s) => isPromptTranslating(s.key));
  const translatingRef = useRef(translating);
  translatingRef.current = translating;

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2000);
    return () => clearTimeout(t);
  }, [notice]);

  const savingRef = useRef(false);
  const runSave = useCallback(async (fn: () => Promise<boolean>) => {
    if (savingRef.current) return; // 連打・ショートカットによる二重保存を防ぐ
    if (translatingRef.current) {
      setNotice("翻訳中は保存できません");
      return; // ショートカット経由でも途中状態を保存しない
    }
    savingRef.current = true;
    try {
      if (await fn()) setNotice("✓ 保存しました");
    } finally {
      savingRef.current = false;
    }
  }, []);
  useSaveShortcuts(runSave);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (translatingRef.current) return;
    if (over && active.id !== over.id) moveSet(String(active.id), String(over.id));
  };

  const handleNew = async () => {
    if (isDirty && !(await confirmDialog("保存していない変更があります。破棄して新規作成しますか？")))
      return;
    resetDoc();
    useTranslateUndoStore.getState().clear();
  };

  /** 取り込みで文書が実際に入れ替わったときだけ「元に戻す」を捨てる（キャンセル時は残す） */
  const handleImport = async () => {
    const before = usePromptStore.getState().doc;
    await importPrompt();
    if (usePromptStore.getState().doc !== before) useTranslateUndoStore.getState().clear();
  };

  const busyTitle = "翻訳中は操作できません";
  const perSet = doc.formatMode === "perSet";
  const prefix = perSet ? "既定の" : "";

  return (
    <div className="prompt-editor">
      <div className="editor-panel">
        {/* 上段：ファイル操作 ｜ 保存 ＋ 状態 …… 翻訳 */}
        <div className="editor-bar">
          <div className="bar-group" role="group" aria-label="ファイル">
            <button
              type="button"
              disabled={translating}
              title={translating ? busyTitle : "空のプロンプトを新しく作る"}
              onClick={() => void handleNew()}
            >
              新規作成
            </button>
            <button
              type="button"
              disabled={translating}
              title={translating ? busyTitle : "MD ファイルを開く"}
              onClick={() => void handleImport()}
            >
              取り込み
            </button>
          </div>
          <span className="bar-sep" aria-hidden="true" />
          <div className="bar-group" role="group" aria-label="保存">
            <button
              type="button"
              disabled={translating}
              onClick={() => void runSave(savePromptAs)}
              title={translating ? busyTitle : "名前を付けて新しいファイルに保存（Ctrl+Shift+S）"}
            >
              MD新規保存
            </button>
            <button
              type="button"
              disabled={!filePath || translating}
              onClick={() => void runSave(savePrompt)}
              title={
                translating
                  ? busyTitle
                  : filePath
                    ? `上書き保存（Ctrl+S）：${filePath}`
                    : "保存先がありません。「MD新規保存」を使ってください"
              }
            >
              上書き保存
            </button>
          </div>
          <div className="file-status">
            <span className="file-name" title={filePath ?? ""}>
              {filePath ? baseName(filePath) : "（新規）"}
            </span>
            {notice ? (
              <span className="notice">{notice}</span>
            ) : (
              isDirty && <span className="dirty">● 未保存</span>
            )}
          </div>
          <div className="spacer" />
          {/* 「全セット 日→英」と「↶ 元に戻す」（翻訳機能が有効なときだけ） */}
          {translationOn && (
            <div className="bar-group" role="group" aria-label="翻訳">
              <BulkTranslateBar sets={doc.sets} />
            </div>
          )}
        </div>

        {/* 下段：表示列 ｜ 書式 */}
        <div className="editor-bar editor-bar--sub">
          <label className="bar-field" title="画面に表示する言語の列（データはどちらも保持されます）">
            <span className="bar-label">表示列</span>
            <select value={langView} onChange={(e) => void setLangView(e.target.value as LangView)}>
              {LANG_VIEWS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="bar-field" title="全セットの見出しの扱い（入力済みの見出しは消えません）">
            <span className="bar-label">見出し</span>
            <select value={headingMode} onChange={(e) => void setHeadingMode(e.target.value as HeadingMode)}>
              {HEADING_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <span className="bar-sep" aria-hidden="true" />
          <label className="bar-field">
            <span className="bar-label">書式</span>
            <select value={doc.formatMode} onChange={(e) => setFormatMode(e.target.value as FormatMode)}>
              <option value="global">全体で1つ</option>
              <option value="perSet">セットごと</option>
            </select>
          </label>
          <label className="bar-field">
            {prefix}区切り
            <select
              value={doc.format.separator}
              onChange={(e) => setGlobalFormat({ separator: e.target.value as Separator })}
            >
              <option value="newline">改行</option>
              <option value="comma">カンマ</option>
            </select>
          </label>
          <label className="check" title={outHeading ? undefined : "見出しを出力しない設定のため無効です"}>
            <input
              type="checkbox"
              checked={doc.format.blankAfterHeading}
              disabled={!outHeading}
              onChange={(e) => setGlobalFormat({ blankAfterHeading: e.target.checked })}
            />
            {prefix}見出し後に空行
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={doc.format.blankAfterSection}
              onChange={(e) => setGlobalFormat({ blankAfterSection: e.target.checked })}
            />
            {prefix}セクション後に空行
          </label>
          <InfoTip label="区切りと改行について">
            見出しのあるセットの前と、見出しだけのセットの後は、区切りの設定にかかわらず改行されます。
          </InfoTip>
        </div>
      </div>

      <div className={`field-row field-row--head${langs.length === 1 ? " field-row--single" : ""}`}>
        <span className="field-row__head-label">
          {translationOn ? "出力 / 翻訳" : "出力"}
          {translationOn && (
            <InfoTip label="翻訳チェックについて" align="start">
              「翻訳」のチェックを外した行は、個別翻訳・一括翻訳のどちらでも対象外になります。
            </InfoTip>
          )}
        </span>
        {langs.map((lang) => (
          <span key={lang}>{LANG_LABEL[lang]}</span>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={doc.sets.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="set-list">
            {doc.sets.map((set, i) => (
              <SetRow
                key={set.id}
                set={set}
                index={i}
                isLast={i === doc.sets.length - 1}
                perSet={perSet}
                globalFormat={doc.format}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button type="button" className="add-set" onClick={addSet}>＋ セットを追加</button>

      <OutputPanel doc={doc} picks={picks} translating={translating} />
    </div>
  );
}
