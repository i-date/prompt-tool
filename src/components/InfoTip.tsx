import { type ReactNode, useId } from "react";

type Props = {
  /** ポップアップに出す説明 */
  children: ReactNode;
  /** 読み上げ用のラベル */
  label?: string;
  /** ポップアップの位置。center：アイコンの中央に合わせる／start：左端をアイコンに合わせる（画面の左端付近で使う） */
  align?: "center" | "start";
};

/** ⓘ アイコン。マウスを乗せる・Tab で移動すると説明をポップアップ表示する */
export function InfoTip({ children, label = "説明", align = "center" }: Props) {
  const id = useId();
  return (
    <span className={`info-tip info-tip--${align}`}>
      <button type="button" className="info-tip__icon" aria-label={label} aria-describedby={id}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.7" r="1" fill="currentColor" />
          <rect x="7.25" y="6.8" width="1.5" height="5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <span id={id} role="tooltip" className="info-tip__pop">
        {children}
      </span>
    </span>
  );
}
