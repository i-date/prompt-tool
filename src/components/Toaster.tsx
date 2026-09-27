import { createPortal } from "react-dom";
import { useToastStore } from "../stores/toastStore";

/** 画面右下の通知。body 直下に出すので、親要素のレイアウトやスクロールの影響を受けない */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return createPortal(
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast${t.tone === "error" ? " toast--error" : ""}`}
          onClick={() => dismiss(t.id)}
        >
          {t.text}
        </div>
      ))}
    </div>,
    document.body,
  );
}
