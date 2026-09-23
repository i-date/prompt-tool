import type { Category, Phrase } from "./types";

export const cat = (id: string, name: string, candidate = true): Category => ({ id, name, candidate });
export const ph = (id: string, ja: string, en: string, extra: Partial<Phrase> = {}): Phrase => ({
  id, ja, en, categoryId: null, tags: [], candidate: true,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...extra,
});
