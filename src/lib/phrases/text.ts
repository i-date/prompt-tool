/** 検索・重複判定用の正規化（全角→半角、大文字→小文字、前後空白除去） */
export const norm = (s: string): string => s.normalize("NFKC").toLowerCase().trim();

export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const v = t.trim();
    const k = norm(v);
    if (v === "" || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

export const parseTagInput = (s: string): string[] => normalizeTags(s.split(/[,、;；]/));
export const phraseKey = (ja: string, en: string): string => `${norm(ja)}\u0000${norm(en)}`;
