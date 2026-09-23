export type Lang = "ja" | "en";
export type Part = "heading" | "content";
export type Separator = "newline" | "comma";
export type FormatMode = "global" | "perSet";
export type TabKey = "prompt" | "phrases" | "settings";

export type Field = { ja: string; en: string; output: boolean };

/** 出力の書式 */
export type FormatOptions = {
  /** このセットと次のセットの間の区切り */
  separator: Separator;
  /** 見出しと内容の間に空行を入れる */
  blankAfterHeading: boolean;
  /** このセットの後（次のセットの前）に空行を入れる */
  blankAfterSection: boolean;
};

export type PromptSet = {
  id: string;
  heading: Field;
  content: Field;
  /** perSet モード時の個別指定（未指定の項目は全体の設定に従う） */
  format?: Partial<FormatOptions>;
};

export type PromptDoc = {
  version: 1;
  formatMode: FormatMode;
  /** global 時の書式、および perSet 時の既定値 */
  format: FormatOptions;
  sets: PromptSet[];
};

/** ランダム選択の抽選結果（保存しない） */
export type SetPicks = { ja: number[]; en: number[] };
export type Picks = Record<string, SetPicks>;
