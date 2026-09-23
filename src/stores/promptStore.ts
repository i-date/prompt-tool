import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import { drawPicks, reconcilePicks } from "../lib/random-syntax";
import type {
  Field,
  FormatMode,
  FormatOptions,
  Lang,
  Part,
  Picks,
  PromptDoc,
  PromptSet,
} from "../types";

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

/** 未保存判定用のスナップショット（id・抽選結果は比較しない。個別書式は順序を固定） */
export const snapshotOf = (doc: PromptDoc): string =>
  JSON.stringify({
    mode: doc.formatMode,
    fmt: [doc.format.separator, doc.format.blankAfterHeading, doc.format.blankAfterSection],
    sets: doc.sets.map((s) => [
      s.heading,
      s.content,
      [s.format?.separator ?? null, s.format?.blankAfterHeading ?? null, s.format?.blankAfterSection ?? null],
    ]),
  });

const drawAll = (sets: PromptSet[]): Picks =>
  Object.fromEntries(sets.map((s) => [s.id, drawPicks(s.content.ja, s.content.en)]));

const patchField = (s: PromptSet, part: Part, patch: Partial<Field>): PromptSet =>
  part === "heading"
    ? { ...s, heading: { ...s.heading, ...patch } }
    : { ...s, content: { ...s.content, ...patch } };

const mapSet = (sets: PromptSet[], id: string, fn: (s: PromptSet) => PromptSet) =>
  sets.map((s) => (s.id === id ? fn(s) : s));

export type PromptState = {
  doc: PromptDoc;
  picks: Picks;
  savedSnapshot: string;
  addSet: () => void;
  removeSet: (id: string) => void;
  moveSet: (activeId: string, overId: string) => void;
  updateText: (id: string, part: Part, lang: Lang, value: string) => void;
  toggleOutput: (id: string, part: Part) => void;
  setFormatMode: (mode: FormatMode) => void;
  setGlobalFormat: (patch: Partial<FormatOptions>) => void;
  /** value に undefined を渡すと「既定（全体の設定に従う）」に戻す */
  setSetFormat: <K extends keyof FormatOptions>(
    id: string,
    key: K,
    value: FormatOptions[K] | undefined,
  ) => void;
  rerollAll: () => void;
  rerollSet: (id: string) => void;
  resetDoc: () => void;
  /** M2：取り込み時に使用 */
  loadDoc: (doc: PromptDoc) => void;
  /** M2：MD保存に成功したときに使用 */
  markSaved: () => void;
};

const initialDoc = createEmptyDoc();

export const usePromptStore = create<PromptState>()((set) => ({
  doc: initialDoc,
  picks: {},
  savedSnapshot: snapshotOf(initialDoc),

  addSet: () => set((s) => ({ doc: { ...s.doc, sets: [...s.doc.sets, createEmptySet()] } })),

  removeSet: (id) =>
    set((s) => {
      const picks = { ...s.picks };
      delete picks[id];
      return { doc: { ...s.doc, sets: s.doc.sets.filter((x) => x.id !== id) }, picks };
    }),

  moveSet: (activeId, overId) =>
    set((s) => {
      const from = s.doc.sets.findIndex((x) => x.id === activeId);
      const to = s.doc.sets.findIndex((x) => x.id === overId);
      if (from < 0 || to < 0) return {};
      return { doc: { ...s.doc, sets: arrayMove(s.doc.sets, from, to) } };
    }),

  updateText: (id, part, lang, value) =>
    set((s) => {
      const target = s.doc.sets.find((x) => x.id === id);
      if (!target) return {};
      const next = patchField(target, part, lang === "ja" ? { ja: value } : { en: value });
      const picks =
        part === "content"
          ? { ...s.picks, [id]: reconcilePicks(target.content, next.content, s.picks[id]) }
          : s.picks;
      return { doc: { ...s.doc, sets: mapSet(s.doc.sets, id, () => next) }, picks };
    }),

  toggleOutput: (id, part) =>
    set((s) => ({
      doc: {
        ...s.doc,
        sets: mapSet(s.doc.sets, id, (x) => patchField(x, part, { output: !x[part].output })),
      },
    })),

  setFormatMode: (mode) => set((s) => ({ doc: { ...s.doc, formatMode: mode } })),

  setGlobalFormat: (patch) =>
    set((s) => ({ doc: { ...s.doc, format: { ...s.doc.format, ...patch } } })),

  setSetFormat: (id, key, value) =>
    set((s) => ({
      doc: {
        ...s.doc,
        sets: mapSet(s.doc.sets, id, (x) => {
          const format: Partial<FormatOptions> = { ...x.format };
          if (value === undefined) delete format[key];
          else format[key] = value;
          return { ...x, format };
        }),
      },
    })),

  rerollAll: () => set((s) => ({ picks: drawAll(s.doc.sets) })),
  rerollSet: (id) =>
    set((s) => {
      const t = s.doc.sets.find((x) => x.id === id);
      if (!t) return {};
      return { picks: { ...s.picks, [id]: drawPicks(t.content.ja, t.content.en) } };
    }),

  resetDoc: () => {
    const doc = createEmptyDoc();
    set({ doc, picks: {}, savedSnapshot: snapshotOf(doc) });
  },
  loadDoc: (doc) => set({ doc, picks: drawAll(doc.sets), savedSnapshot: snapshotOf(doc) }),
  markSaved: () => set((s) => ({ savedSnapshot: snapshotOf(s.doc) })),
}));

export const selectIsDirty = (s: PromptState) => snapshotOf(s.doc) !== s.savedSnapshot;
