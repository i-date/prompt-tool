import { useEffect, useLayoutEffect, useRef } from "react";
import { fitTextareas } from "../lib/autosize";

type El = HTMLTextAreaElement | HTMLInputElement;
export type ElRef = { readonly current: El | null };

type Options = {
  /** false のときは何もしない（1 行入力欄などで使う） */
  enabled?: boolean;
  /** 内容の下に足す行数（既定 1） */
  extraLines?: number;
  /** 欄の出し入れ（列の表示切り替えなど）を知らせる値。変わると監視対象を付け直して再計算する */
  layoutKey?: string;
};

const textareas = (refs: readonly ElRef[]): HTMLTextAreaElement[] =>
  refs.map((r) => r.current).filter((el): el is HTMLTextAreaElement => el instanceof HTMLTextAreaElement);

/**
 * textarea の高さを「内容の行数 + extraLines 行」に自動で合わせる。
 * ref を配列で渡すと、全員をいちばん高い欄にそろえる（日英の欄を同じ高さにするなど）。
 * 表示されていない欄（ref が null）は無視する。
 *
 * @param contentKey 中身が変わったことを知らせる値。グループのときは全欄の値をつないだ文字列を渡す
 */
export function useAutoResize(
  target: ElRef | readonly ElRef[],
  contentKey: string,
  { enabled = true, extraLines = 1, layoutKey = "" }: Options = {},
): void {
  const list: readonly ElRef[] = "current" in target ? [target] : target;
  const refsRef = useRef<readonly ElRef[]>(list);

  // 最新の ref の一覧を控えておく（配列は毎回作り直されるので effect の依存には入れない）
  useLayoutEffect(() => {
    refsRef.current = list;
  });

  // 描画前に合わせる（入力のたびに高さがちらつかないように）
  useLayoutEffect(() => {
    if (enabled) fitTextareas(textareas(refsRef.current), extraLines);
  }, [contentKey, enabled, extraLines, layoutKey]);

  // 幅が変わったら（ウィンドウ幅の変更・列の表示切り替えなど）計算し直す
  useEffect(() => {
    const els = textareas(refsRef.current);
    if (!enabled || els.length === 0 || typeof ResizeObserver === "undefined") return;
    const widths = new Map(els.map((el) => [el, el.clientWidth]));
    const ro = new ResizeObserver(() => {
      let changed = false;
      for (const el of els) {
        const w = el.clientWidth;
        if (widths.get(el) !== w) {
          widths.set(el, w);
          changed = true;
        }
      }
      if (changed) fitTextareas(els, extraLines); // 高さだけの変化では何もしない（無限ループ防止）
    });
    for (const el of els) ro.observe(el);
    return () => ro.disconnect();
  }, [enabled, extraLines, layoutKey]);
}
