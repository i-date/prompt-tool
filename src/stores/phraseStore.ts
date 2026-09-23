import { arrayMove } from "@dnd-kit/sortable";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { create } from "zustand";
import { parsePhraseData, serializePhraseData } from "../lib/phrases/schema";
import { norm, normalizeTags, phraseKey } from "../lib/phrases/text";
import { applyImport, type ImportMode, type ImportPayload, type ImportResult } from "../lib/phrases/transfer";
import { emptyPhraseData, newId, type PhraseData, type PhraseInput } from "../lib/phrases/types";

type Status = "idle" | "loading" | "ready" | "readonly";
type PhraseFiles = { main: string | null; mainExists: boolean; backup: string | null };

type PhraseState = {
  data: PhraseData;
  status: Status;
  message: string | null;
  load: () => Promise<void>;
  dismissMessage: () => void;
  hasDuplicate: (ja: string, en: string, exceptId?: string) => boolean;
  addPhrase: (input: PhraseInput) => void;
  updatePhrase: (id: string, patch: Partial<PhraseInput>) => void;
  deletePhrase: (id: string) => void;
  movePhrase: (activeId: string, overId: string) => void;
  addCategory: (name: string, candidate: boolean) => string | null;
  renameCategory: (id: string, name: string) => string | null;
  setCategoryCandidate: (id: string, candidate: boolean) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (activeId: string, overId: string) => void;
  importPayload: (payload: ImportPayload, mode: ImportMode) => ImportResult | null;
};

const clean = (i: PhraseInput): PhraseInput => ({
  ja: i.ja.trim(),
  en: i.en.trim(),
  categoryId: i.categoryId,
  tags: normalizeTags(i.tags),
  candidate: i.candidate,
});

const move = <T extends { id: string }>(list: T[], activeId: string, overId: string): T[] => {
  const from = list.findIndex((x) => x.id === activeId);
  const to = list.findIndex((x) => x.id === overId);
  return from < 0 || to < 0 ? list : arrayMove(list, from, to);
};

let saveQueue: Promise<void> = Promise.resolve();

export const usePhraseStore = create<PhraseState>()((set, get) => {
  const now = () => new Date().toISOString();
  // 保存は順番に実行（連続編集で書き込みが前後しないように）
  const persist = (data: PhraseData) => {
    const text = serializePhraseData(data);
    saveQueue = saveQueue
      .then(() => invoke<void>("save_phrases_file", { text }))
      .catch((e) => set({ message: `フレーズの保存に失敗しました: ${String(e)}` }));
  };
  const commit = (fn: (d: PhraseData) => PhraseData): boolean => {
    if (get().status !== "ready") return false;
    const data = fn(get().data);
    set({ data });
    persist(data);
    return true;
  };
  const checkName = (name: string, exceptId?: string): string | null => {
    const n = name.trim();
    if (n === "") return "カテゴリ名を入力してください";
    if (get().status !== "ready") return "現在は編集できません";
    if (get().data.categories.some((c) => c.id !== exceptId && norm(c.name) === norm(n))) {
      return `「${n}」は既にあります`;
    }
    return null;
  };

  return {
    data: emptyPhraseData(),
    status: "idle",
    message: null,

    load: async () => {
      set({ status: "loading", message: null });
      try {
        const f = await invoke<PhraseFiles>("load_phrases_file");
        const tryParse = (t: string | null) => {
          if (t === null) return null;
          try {
            return parsePhraseData(t);
          } catch {
            return null;
          }
        };
        const main = tryParse(f.main);
        if (main) {
          set({ data: main, status: "ready" });
          return;
        }
        const backup = tryParse(f.backup);
        if (backup) {
          set({
            data: backup,
            status: "ready",
            message: f.mainExists ? "phrases.json が読めなかったため、バックアップから復元しました。" : null,
          });
          return;
        }
        if (!f.mainExists && f.backup === null) {
          set({ data: emptyPhraseData(), status: "ready" });
          return;
        }
        set({ status: "readonly", message: "phrases.json とバックアップの両方が読み込めません。ファイルを確認してください（編集は無効です）。" });
      } catch (e) {
        set({ status: "readonly", message: `フレーズの読み込みに失敗しました: ${String(e)}` });
      }
    },
    dismissMessage: () => set({ message: null }),

    hasDuplicate: (ja, en, exceptId) => {
      const k = phraseKey(ja, en);
      return get().data.phrases.some((p) => p.id !== exceptId && phraseKey(p.ja, p.en) === k);
    },
    addPhrase: (input) => {
      commit((d) => ({
        ...d,
        phrases: [...d.phrases, { id: newId(), ...clean(input), createdAt: now(), updatedAt: now() }],
      }));
    },
    updatePhrase: (id, patch) => {
      commit((d) => ({
        ...d,
        phrases: d.phrases.map((p) => (p.id === id ? { ...p, ...clean({ ...p, ...patch }), updatedAt: now() } : p)),
      }));
    },
    deletePhrase: (id) => {
      commit((d) => ({ ...d, phrases: d.phrases.filter((p) => p.id !== id) }));
    },
    movePhrase: (activeId, overId) => {
      commit((d) => ({ ...d, phrases: move(d.phrases, activeId, overId) }));
    },

    addCategory: (name, candidate) => {
      const err = checkName(name);
      if (err) return err;
      commit((d) => ({ ...d, categories: [...d.categories, { id: newId(), name: name.trim(), candidate }] }));
      return null;
    },
    renameCategory: (id, name) => {
      const err = checkName(name, id);
      if (err) return err;
      commit((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) }));
      return null;
    },
    setCategoryCandidate: (id, candidate) => {
      commit((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, candidate } : c)) }));
    },
    deleteCategory: (id) => {
      commit((d) => ({
        ...d,
        categories: d.categories.filter((c) => c.id !== id),
        phrases: d.phrases.map((p) => (p.categoryId === id ? { ...p, categoryId: null, updatedAt: now() } : p)),
      }));
    },
    moveCategory: (activeId, overId) => {
      commit((d) => ({ ...d, categories: move(d.categories, activeId, overId) }));
    },

    importPayload: (payload, mode) => {
      const result = applyImport(get().data, payload, mode);
      return commit(() => result.data) ? result : null;
    },
  };
});

/** フレーズ／カテゴリ画面を開いたときに一度だけ読み込む */
export function useEnsurePhrasesLoaded(): void {
  useEffect(() => {
    const s = usePhraseStore.getState();
    if (s.status === "idle") void s.load();
  }, []);
}
