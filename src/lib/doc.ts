import type { FormatOptions, PromptDoc, PromptSet } from "../types";

export const DEFAULT_FORMAT: FormatOptions = {
  separator: "newline",
  blankAfterHeading: false,
  blankAfterSection: false,
};

export const createEmptySet = (): PromptSet => ({
  id: crypto.randomUUID(),
  heading: { ja: "", en: "", output: true },
  content: { ja: "", en: "", output: true },
});

export const createEmptyDoc = (): PromptDoc => ({
  version: 1,
  formatMode: "global",
  format: { ...DEFAULT_FORMAT },
  sets: [createEmptySet()],
});
