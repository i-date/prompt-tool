/** プロンプト作成タブの見出しの扱い */
export type HeadingMode = "on" | "noOutput" | "hidden";

export const HEADING_MODES: readonly { value: HeadingMode; label: string }[] = [
  { value: "on", label: "表示して出力" },
  { value: "noOutput", label: "表示のみ（出力しない）" },
  { value: "hidden", label: "非表示（出力しない）" },
];

export const DEFAULT_HEADING_MODE: HeadingMode = "on";

/** 保存値の検証（不正値・未保存は「表示して出力」） */
export const sanitizeHeadingMode = (v: unknown): HeadingMode =>
  v === "on" || v === "noOutput" || v === "hidden" ? v : DEFAULT_HEADING_MODE;

/** 見出しを最終プロンプトに出力するか */
export const headingOutput = (m: HeadingMode): boolean => m === "on";

/** 見出しの欄を画面に表示するか（表示中の欄だけ翻訳・挿入の対象にする） */
export const headingVisible = (m: HeadingMode): boolean => m !== "hidden";
