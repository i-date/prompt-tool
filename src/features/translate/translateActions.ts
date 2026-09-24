import { ask, message } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { type TransLang, translateTexts } from "../../lib/translate/client";

/** 実行中の翻訳（同時に1件だけ）。"bulk" = 一括、"set:<id>" = セット単位 */
export const useTranslateBusy = create<{ key: string | null }>()(() => ({ key: null }));
export const BULK_KEY = "bulk";
export const setBusyKey = (setId: string): string => `set:${setId}`;

const LABEL: Record<TransLang, string> = { ja: "日本語", en: "英語" };
export type FieldJob<K extends string> = { key: K; label: string; source: string; target: string };
export type Applied<K extends string> = { key: K; prev: string; next: string };

function overwriteMessage(to: TransLang, labels: string[]): string {
  const MAX = 6;
  const shown = labels.slice(0, MAX).join("」「");
  const more = labels.length > MAX ? ` ほか ${labels.length - MAX} 欄` : "";
  return `${LABEL[to]}の「${shown}」${more}を翻訳結果で上書きします。よろしいですか？`;
}

/** 翻訳元が空の欄は対象外。上書きがある場合のみ確認。変更された欄を返す */
export async function translateWithConfirm<K extends string>(opts: {
  busyKey: string;
  from: TransLang;
  to: TransLang;
  fields: FieldJob<K>[];
  apply: (key: K, text: string) => void;
}): Promise<Applied<K>[]> {
  if (useTranslateBusy.getState().key !== null) return [];
  const jobs = opts.fields.filter((f) => f.source.trim() !== "");
  if (jobs.length === 0) return [];

  const overwrite = jobs.filter((f) => f.target.trim() !== "");
  if (overwrite.length > 0) {
    const ok = await ask(overwriteMessage(opts.to, overwrite.map((f) => f.label)), {
      title: "翻訳の確認",
      kind: "warning",
      okLabel: "上書きする",
      cancelLabel: "キャンセル",
    });
    if (!ok) return [];
  }

  useTranslateBusy.setState({ key: opts.busyKey });
  try {
    const r = await translateTexts(jobs.map((f) => f.source), opts.from, opts.to);
    const applied = jobs.map((f, i) => ({ key: f.key, prev: f.target, next: r.texts[i] }));
    for (const a of applied) opts.apply(a.key, a.next);
    if (r.fallbackCount > 0) {
      await message(
        `[A / B] の位置を翻訳エンジンが保てなかったため、${r.fallbackCount} 件は部分ごとに翻訳しました。結果を確認してください。`,
        { title: "翻訳の注意", kind: "info" },
      );
    }
    return applied.filter((a) => a.prev !== a.next);
  } catch (e) {
    await message(e instanceof Error ? e.message : String(e), { title: "翻訳エラー", kind: "error" });
    return [];
  } finally {
    useTranslateBusy.setState({ key: null });
  }
}
