import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast, TOAST_DURATION, TOAST_MAX, useToastStore } from "./toastStore";

const texts = () => useToastStore.getState().toasts.map((t) => t.text);

describe("toastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("表示して、一定時間後に消える", () => {
    showToast("コピーしました");
    expect(texts()).toEqual(["コピーしました"]);
    vi.advanceTimersByTime(TOAST_DURATION);
    expect(texts()).toEqual([]);
  });

  it("同じ文言は置き換わり、表示時間も延びる", () => {
    showToast("再抽選しました");
    vi.advanceTimersByTime(TOAST_DURATION - 500);
    showToast("再抽選しました");
    expect(texts()).toEqual(["再抽選しました"]);
    vi.advanceTimersByTime(500); // 1 回目のタイマーでは消えない
    expect(texts()).toEqual(["再抽選しました"]);
    vi.advanceTimersByTime(TOAST_DURATION);
    expect(texts()).toEqual([]);
  });

  it("違う文言は並べて表示し、上限を超えたら古いものから消す", () => {
    for (let i = 0; i < TOAST_MAX + 1; i++) showToast(`msg${i}`);
    expect(texts()).toEqual(Array.from({ length: TOAST_MAX }, (_, i) => `msg${i + 1}`));
  });

  it("tone を省略すると accent になる", () => {
    showToast("a");
    showToast("b", "error");
    expect(useToastStore.getState().toasts.map((t) => t.tone)).toEqual(["accent", "error"]);
  });
});
