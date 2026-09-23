import { type Category, type Phrase, isEffectiveCandidate } from "./types";

export type SortKey = "ja" | "en" | "category" | "candidate";
export type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

export const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

export function nextSort(cur: SortState, key: SortKey): SortState {
  if (!cur || cur.key !== key) return { key, dir: "asc" };
  return cur.dir === "asc" ? { key, dir: "desc" } : null;
}

export function sortPhrases(list: Phrase[], sort: SortState, categories: Category[]): Phrase[] {
  if (!sort) return list;
  const names = new Map(categories.map((c) => [c.id, c.name] as const));
  const value = (p: Phrase): string | number => {
    switch (sort.key) {
      case "ja":
        return p.ja;
      case "en":
        return p.en;
      case "category":
        return p.categoryId ? (names.get(p.categoryId) ?? "") : "";
      case "candidate":
        return isEffectiveCandidate(p, categories) ? 0 : 1;
    }
  };
  const sign = sort.dir === "asc" ? 1 : -1;
  return list
    .map((p, i) => ({ p, i, v: value(p) }))
    .sort((a, b) => {
      const ea = a.v === "";
      const eb = b.v === "";
      if (ea !== eb) return ea ? 1 : -1; // 空欄は常に末尾
      const c =
        typeof a.v === "number" && typeof b.v === "number"
          ? a.v - b.v
          : collator.compare(String(a.v), String(b.v));
      return c !== 0 ? c * sign : a.i - b.i;
    })
    .map((x) => x.p);
}
