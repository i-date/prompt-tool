import { type ChangeEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";
import {
  applySuggestion,
  buildPool,
  findSuggestions,
  type SuggestItem,
  type SuggestLang,
  type SuggestResult,
} from "../lib/phrases/suggest";
import { useEnsurePhrasesLoaded, usePhraseStore } from "../stores/phraseStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAutoResize } from "./useAutoResize";

type El = HTMLInputElement | HTMLTextAreaElement;
type Open = SuggestResult & { index: number };
type Props = {
  lang: SuggestLang;
  value: string;
  onValueChange: (value: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  /** 候補を挿入した直後に呼ぶ（もう一方の言語の欄へ訳を追加するなど）。指定時は候補に「＋ 訳」を表示 */
  onPick?: (item: SuggestItem) => void;
  /** 入力欄の要素を親に渡す（親で複数欄の高さをそろえるときなど） */
  inputRef?: (el: El | null) => void;
  /** 複数行のとき自分で高さを合わせるか（既定 true）。親がまとめて合わせるときは false */
  autoResize?: boolean;
};

/** 入力中の語句に合うフレーズを下に表示する入力欄（↑↓で選択、Enter / Tab で挿入、Esc で閉じる） */
export function SuggestField({
  lang,
  value,
  onValueChange,
  multiline,
  readOnly = false,
  placeholder,
  onFocus,
  onPick,
  inputRef,
  autoResize = true,
}: Props) {
  useEnsurePhrasesLoaded();
  const suggestOn = useSettingsStore((s) => s.suggest);
  const data = usePhraseStore((s) => s.data);
  const pool = useMemo(() => buildPool(data), [data]);
  const elRef = useRef<El | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const enabled = suggestOn && !readOnly;
  const shown = enabled ? open : null;

  // 複数行のときは「テキスト行数 + 1 行」の高さに自動調整（親がそろえる場合はしない）
  useAutoResize(elRef, value, { enabled: !!multiline && autoResize });

  const setEl = (el: El | null) => {
    elRef.current = el;
    inputRef?.(el);
  };

  const refresh = (text: string, el: El) => {
    const caret = el.selectionStart;
    if (!enabled || caret === null || caret !== el.selectionEnd) {
      setOpen(null);
      return;
    }
    const r = findSuggestions(pool, text, caret, lang);
    setOpen(r ? { ...r, index: 0 } : null);
  };

  const apply = (index: number) => {
    const item = shown?.items[index];
    if (!shown || !item) return;
    const r = applySuggestion(value, shown.start, shown.end, item.insert);
    setOpen(null);
    onValueChange(r.value);
    onPick?.(item);
    requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(r.caret, r.caret);
    });
  };

  const onKeyDown = (e: KeyboardEvent<El>) => {
    if (!shown || e.nativeEvent.isComposing) return; // 変換中の Enter は IME の確定
    const n = shown.items.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen({ ...shown, index: (shown.index + 1) % n });
        break;
      case "ArrowUp":
        e.preventDefault();
        setOpen({ ...shown, index: (shown.index - 1 + n) % n });
        break;
      case "Enter":
      case "Tab":
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
        e.preventDefault();
        apply(shown.index);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(null);
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "Home":
      case "End":
      case "PageUp":
      case "PageDown":
        setOpen(null);
        break;
    }
  };

  const common = {
    value,
    placeholder,
    readOnly,
    onChange: (e: ChangeEvent<El>) => {
      onValueChange(e.target.value);
      refresh(e.target.value, e.target);
    },
    onKeyDown,
    onFocus,
    onBlur: () => setOpen(null),
    onClick: () => setOpen(null),
    "aria-autocomplete": "list" as const,
  };

  return (
    <div className="suggest">
      {multiline ? (
        <textarea rows={1} className="autosize" ref={setEl} {...common} />
      ) : (
        <input type="text" ref={setEl} {...common} />
      )}
      {shown && (
        <ul className="suggest__list" role="listbox">
          {shown.items.map((it, i) => (
            <li
              key={it.id}
              role="option"
              aria-selected={i === shown.index}
              className="suggest__item"
              onMouseDown={(e) => {
                e.preventDefault(); // 入力欄のフォーカスを外さない
                apply(i);
              }}
              onMouseEnter={() => setOpen({ ...shown, index: i })}
            >
              <span className="suggest__main">{it.insert}</span>
              {it.other && (
                <span className="suggest__sub" title={onPick ? "もう一方の言語の欄にも追加されます" : undefined}>
                  {onPick ? `＋ ${it.other}` : it.other}
                </span>
              )}
              {it.category && <span className="suggest__cat">{it.category}</span>}
            </li>
          ))}
          <li className="suggest__foot" aria-hidden="true">
            ↑↓ 選択　Enter / Tab 挿入{onPick ? "（＋ はもう一方の欄にも追加）" : ""}　Esc 閉じる
          </li>
        </ul>
      )}
    </div>
  );
}
