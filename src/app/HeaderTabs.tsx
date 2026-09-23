import type { TabKey } from "../types";

const TABS: { key: TabKey; label: string }[] = [
  { key: "prompt", label: "プロンプト作成" },
  { key: "phrases", label: "フレーズ管理" },
  { key: "categories", label: "カテゴリ管理" },
  { key: "settings", label: "設定" },
];

type Props = { active: TabKey; onChange: (key: TabKey) => void };

export function HeaderTabs({ active, onChange }: Props) {
  return (
    <header className="header">
      <span className="header__title">Prompt Tool</span>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className="tab"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
