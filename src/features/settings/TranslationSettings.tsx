import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { translateTexts } from "../../lib/translate/client";
import type { Engine } from "../../lib/translate/settings";
import { type Provider, useTranslationSettingsStore } from "../../stores/translationSettingsStore";

type Usage = { plan: "free" | "pro"; characterCount: number; characterLimit: number };
type Status = { kind: "ok" | "error"; text: string } | null;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fmt = (n: number) => n.toLocaleString("ja-JP");

function useAction() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const act = async (fn: () => Promise<string>) => {
    setBusy(true);
    setStatus(null);
    try {
      setStatus({ kind: "ok", text: await fn() });
    } catch (e) {
      setStatus({ kind: "error", text: errText(e) });
    } finally {
      setBusy(false);
    }
  };
  return { busy, status, setStatus, act };
}

const StatusLine = ({ status }: { status: Status }) =>
  status ? <p className={`ts-status ${status.kind}`}>{status.text}</p> : null;

const ENGINES: { value: Engine; label: string }[] = [
  { value: "deepl", label: "DeepL（クラウド）" },
  { value: "google", label: "Google 翻訳（Cloud Translation）" },
  { value: "ollama", label: "Ollama（ローカル LLM）" },
];

function ApiKeySection(props: {
  provider: Provider;
  title: string;
  active: boolean;
  placeholder: string;
  note: string;
  test: () => Promise<string>;
}) {
  const { provider, title, active, placeholder, note, test } = props;
  const keyStatus = useTranslationSettingsStore((s) => s.keyStatus[provider]);
  const refresh = useTranslationSettingsStore((s) => s.refreshKeyStatus);
  const [input, setInput] = useState("");
  const { busy, status, setStatus, act } = useAction();

  useEffect(() => {
    refresh(provider).catch((e) => setStatus({ kind: "error", text: errText(e) }));
  }, [provider, refresh, setStatus]);

  const registered = keyStatus?.registered ?? false;
  const stateLabel =
    keyStatus === undefined
      ? "確認中…"
      : registered
        ? `登録済み${provider === "deepl" ? `（${keyStatus.free ? "Free" : "Pro"}）` : ""}`
        : "未登録";

  const save = () =>
    act(async () => {
      await invoke("set_api_key", { provider, key: input });
      setInput("");
      await refresh(provider);
      return "API キーを資格情報マネージャーに保存しました";
    });
  const remove = async () => {
    if (!(await ask(`保存済みの ${title} API キーを削除しますか？`, { title: "API キー削除", kind: "warning" }))) return;
    await act(async () => {
      await invoke("delete_api_key", { provider });
      await refresh(provider);
      return "API キーを削除しました";
    });
  };

  return (
    <fieldset className="ts-group" data-active={active}>
      <legend>{title}</legend>
      <div className="ts-row">
        <span className="ts-label">API キー</span>
        <span className="hint">{stateLabel}</span>
      </div>
      <div className="ts-row">
        <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} autoComplete="off" className="ts-wide" />
        <button type="button" onClick={() => void save()} disabled={busy || input.trim() === ""}>保存</button>
        <button type="button" onClick={() => void remove()} disabled={busy || !registered}>削除</button>
        <button type="button" onClick={() => void act(test)} disabled={busy || !registered}>接続テスト</button>
        {busy && <span className="hint">実行中…</span>}
      </div>
      <p className="hint">{note}</p>
      <StatusLine status={status} />
    </fieldset>
  );
}

function OllamaSection({ active }: { active: boolean }) {
  const settings = useTranslationSettingsStore((s) => s.settings);
  const update = useTranslationSettingsStore((s) => s.update);
  const [url, setUrl] = useState(settings.ollamaUrl);
  const [model, setModel] = useState(settings.ollamaModel);
  const [models, setModels] = useState<string[]>([]);
  const { busy, status, act } = useAction();

  useEffect(() => {
    setUrl(settings.ollamaUrl);
    setModel(settings.ollamaModel);
  }, [settings.ollamaUrl, settings.ollamaModel]);

  const commit = () => update({ ollamaUrl: url, ollamaModel: model });
  const fetchModels = () =>
    act(async () => {
      await commit();
      const list = await invoke<string[]>("ollama_models", { url });
      setModels(list);
      const m = model.trim();
      const found = list.some((n) => n === m || n === `${m}:latest`);
      return found
        ? `接続OK。モデル「${m}」を利用できます（${list.length} モデル）`
        : `接続OK（${list.length} モデル）。「${m}」は未取得です: ollama pull ${m}`;
    });

  return (
    <fieldset className="ts-group" data-active={active}>
      <legend>Ollama</legend>
      <div className="ts-row">
        <span className="ts-label">URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => void commit()} className="ts-wide" />
      </div>
      <div className="ts-row">
        <span className="ts-label">モデル</span>
        <input value={model} onChange={(e) => setModel(e.target.value)} onBlur={() => void commit()} list="ollama-models" className="ts-wide" />
        <datalist id="ollama-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
        <button type="button" onClick={() => void fetchModels()} disabled={busy}>接続確認・モデル一覧</button>
      </div>
      <p className="hint">初回の翻訳はモデルの読み込みに時間がかかります。推奨: translategemma（ollama pull translategemma）</p>
      <StatusLine status={status} />
    </fieldset>
  );
}

export function TranslationSettings() {
  const settings = useTranslationSettingsStore((s) => s.settings);
  const loaded = useTranslationSettingsStore((s) => s.loaded);
  const update = useTranslationSettingsStore((s) => s.update);
  const { busy, status, setStatus, act } = useAction();

  useEffect(() => {
    useTranslationSettingsStore.getState().ensureLoaded().catch((e) => setStatus({ kind: "error", text: errText(e) }));
  }, [setStatus]);

  const testDeepl = async () => {
    const u = await invoke<Usage>("deepl_usage");
    return `接続OK（${u.plan === "free" ? "Free" : "Pro"}）今月の使用量: ${fmt(u.characterCount)} / ${fmt(u.characterLimit)} 文字`;
  };
  const testGoogle = async () => `接続OK:「テスト」→「${await invoke<string>("google_test")}」`;
  const testTranslate = () =>
    act(async () => {
      const r = await translateTexts(["[黒髪 / 金髪]の少女、教室の窓際"], "ja", "en");
      return `テスト翻訳: ${r.texts[0]}${r.fallbackCount > 0 ? "（部分翻訳で組み立て）" : ""}`;
    });

  return (
    <section className="translation-settings">
      <h2>翻訳</h2>
      <div className="ts-row">
        <span className="ts-label">翻訳エンジン</span>
        {ENGINES.map((e) => (
          <label key={e.value}>
            <input type="radio" name="engine" checked={settings.engine === e.value} onChange={() => void update({ engine: e.value })} disabled={!loaded} />
            {e.label}
          </label>
        ))}
      </div>

      <ApiKeySection
        provider="deepl"
        title="DeepL"
        active={settings.engine === "deepl"}
        placeholder="xxxxxxxx-xxxx-...:fx"
        note="末尾が :fx のキーは Free 版として扱います。キーは Windows の資格情報マネージャーに保存され、ファイルやリポジトリには書き込まれません。"
        test={testDeepl}
      />
      <ApiKeySection
        provider="google"
        title="Google 翻訳"
        active={settings.engine === "google"}
        placeholder="AIza..."
        note="Google Cloud で Cloud Translation API を有効化して作成した API キーを使います。キーは「Cloud Translation API のみ」に制限しておくと安全です。"
        test={testGoogle}
      />
      <OllamaSection active={settings.engine === "ollama"} />

      <div className="ts-row">
        <button type="button" onClick={() => void testTranslate()} disabled={busy || !loaded}>
          テスト翻訳（選択中のエンジンで日→英）
        </button>
        {busy && <span className="hint">実行中…</span>}
      </div>
      <StatusLine status={status} />
    </section>
  );
}
