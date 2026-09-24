/** 自動高さ調整の計算 */

export type AutoHeightInput = {
  /** 高さを最小まで縮めた状態での scrollHeight（内容 + 上下の padding） */
  scrollHeight: number;
  /** 1 行の高さ（px） */
  lineHeight: number;
  /** 上下の border の合計（px）。box-sizing: border-box なので height に含める */
  borderY: number;
  /** 内容の下に足す行数 */
  extraLines: number;
};

/** 「内容の行数 + extraLines 行」ぶんの height（px） */
export function autoHeightPx({ scrollHeight, lineHeight, borderY, extraLines }: AutoHeightInput): number {
  return Math.ceil(scrollHeight + borderY + lineHeight * extraLines);
}

/** 複数欄を同じ高さにそろえるときの height（px）。いちばん高い欄に合わせる */
export function groupHeightPx(inputs: readonly AutoHeightInput[]): number {
  return inputs.reduce((max, input) => Math.max(max, autoHeightPx(input)), 0);
}

/** getComputedStyle の lineHeight を px に直す（"normal" などの場合は fontSize × 1.2） */
export function parseLineHeight(lineHeight: string, fontSize: string): number {
  const lh = Number.parseFloat(lineHeight);
  if (Number.isFinite(lh) && lh > 0 && lineHeight.endsWith("px")) return lh;
  const fs = Number.parseFloat(fontSize);
  return (Number.isFinite(fs) && fs > 0 ? fs : 14) * 1.2;
}

const px = (v: string) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * 複数の textarea を「いちばん行数の多い欄の行数 + extraLines 行」の同じ高さにそろえる。
 * 先に全部縮めてから測るので、長い側の行を消したときも両方ちゃんと低くなる。
 */
export function fitTextareas(els: readonly HTMLTextAreaElement[], extraLines = 1): void {
  if (els.length === 0) return;
  const scrollY = window.scrollY; // 一瞬縮めたときにページのスクロール位置が動くのを防ぐ
  for (const el of els) el.style.height = "auto"; // rows=1 まで縮める
  const inputs = els.map((el): AutoHeightInput => {
    const cs = getComputedStyle(el);
    return {
      scrollHeight: el.scrollHeight,
      lineHeight: parseLineHeight(cs.lineHeight, cs.fontSize),
      borderY: px(cs.borderTopWidth) + px(cs.borderBottomWidth),
      extraLines,
    };
  });
  const h = groupHeightPx(inputs);
  for (const el of els) el.style.height = `${h}px`;
  if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY });
}

/** 1 つの textarea だけを合わせる */
export function fitTextarea(el: HTMLTextAreaElement, extraLines = 1): void {
  fitTextareas([el], extraLines);
}
