export type Category = { id: string; name: string; candidate: boolean };
export type Phrase = {
  id: string;
  ja: string;
  en: string;
  categoryId: string | null;
  tags: string[];
  candidate: boolean;
  createdAt: string;
  updatedAt: string;
};
export type PhraseData = { version: 1; categories: Category[]; phrases: Phrase[] };
export type PhraseInput = Pick<Phrase, "ja" | "en" | "categoryId" | "tags" | "candidate">;

export const emptyPhraseData = (): PhraseData => ({ version: 1, categories: [], phrases: [] });
export const newId = (): string => crypto.randomUUID();

/** カテゴリの「候補の対象」も加味して、実際に候補として出るか */
export function isEffectiveCandidate(p: Phrase, categories: Category[]): boolean {
  if (!p.candidate) return false;
  if (p.categoryId === null) return true;
  return categories.find((c) => c.id === p.categoryId)?.candidate ?? true;
}
