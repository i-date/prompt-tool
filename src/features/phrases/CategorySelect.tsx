import type { Category } from "../../lib/phrases/types";

export function CategorySelect({ value, onChange, categories, disabled }: {
  value: string;
  onChange: (id: string) => void;
  categories: Category[];
  disabled?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label="カテゴリ">
      <option value="">（未分類）</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>{c.name}{c.candidate ? "" : "（候補OFF）"}</option>
      ))}
    </select>
  );
}
