import { type ReactNode, useId } from "react";

type Props = {
  /** ポップアップに出す説明 */
  children: ReactNode;
  /** 読み上げ用のラベル */
  label?: string;
  /** ポップアップの位置。center：アイコンの中央に合わせる／start：左端をアイコンに合わせる */
  align?: "center" | "start";
  /** info：ⓘ（説明）／warn：⚠（注意） */
  tone?: "info" | "warn";
};

/** ⓘ / ⚠ アイコン。マウスを乗せる・Tab で移動すると説明をポップアップ表示する */
export function InfoTip({ children, label = "説明", align = "center", tone = "info" }: Props) {
  const id = useId();
  return (
    <span className={`info-tip info-tip--${align} info-tip--${tone}`}>
      <button type="button" className="info-tip__icon" aria-label={label} aria-describedby={id}>
        {tone === "warn" ? (
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8 1.8 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <rect x="7.25" y="6" width="1.5" height="4.2" rx="0.75" fill="currentColor" />
            <circle cx="8" cy="12" r="0.9" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="8" cy="4.7" r="1" fill="currentColor" />
            <rect x="7.25" y="6.8" width="1.5" height="5" rx="0.75" fill="currentColor" />
          </svg>
        )}
      </button>
      <span id={id} role="tooltip" className="info-tip__pop">
        {children}
      </span>
    </span>
  );
}
