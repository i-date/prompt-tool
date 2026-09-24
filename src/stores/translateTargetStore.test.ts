import { describe, expect, it } from "vitest";
import { isTranslateTarget, useTranslateTargetStore } from "./translateTargetStore";

describe("translateTargetStore", () => {
  it("既定は対象、OFF にした欄だけ除外し、ON で戻る", () => {
    const off = () => useTranslateTargetStore.getState().off;
    const { setTarget } = useTranslateTargetStore.getState();
    expect(isTranslateTarget(off(), "a", "heading")).toBe(true);
    setTarget("a", "heading", false);
    expect(isTranslateTarget(off(), "a", "heading")).toBe(false);
    expect(isTranslateTarget(off(), "a", "content")).toBe(true);
    setTarget("a", "heading", true);
    expect(isTranslateTarget(off(), "a", "heading")).toBe(true);
  });
});
