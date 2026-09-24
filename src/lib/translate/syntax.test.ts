import { describe, expect, it } from "vitest";
import { joinSyntax, splitSyntax, translatePreservingSyntax } from "./syntax";

function dictFn(dict: Record<string, string>) {
  const calls: string[][] = [];
  const fn = async (items: string[]) => {
    calls.push(items);
    return items.map((s) => dict[s] ?? `?${s}`);
  };
  return { fn, calls };
}

const HAIR = { 黒髪: "black hair", 金髪: "blonde hair" };

describe("translatePreservingSyntax", () => {
  it("スラッシュ無しの角括弧は対象外、選択肢はトリムして再構成", () => {
    const p = splitSyntax("[tag]と[a / b ]");
    expect(p).toEqual([{ kind: "text", value: "[tag]と" }, { kind: "group", options: ["a", "b"] }]);
    expect(joinSyntax(p)).toBe("[tag]と[a / b]");
  });

  it("目印付きテンプレートと選択肢を翻訳して組み立てる", async () => {
    const { fn } = dictFn({ ...HAIR, '<x i="0"/>の少女': 'a girl with <x i="0"/>' });
    const r = await translatePreservingSyntax(["[黒髪 / 金髪]の少女"], "xml", "en", fn);
    expect(r).toEqual({ texts: ["a girl with [black hair / blonde hair]"], fallbackCount: 0 });
  });

  it("語順が入れ替わっても番号で正しく戻す", async () => {
    const { fn } = dictFn({
      猫: "cat", 犬: "dog", 少女: "girl", 少年: "boy",
      '<x i="0"/>と遊ぶ<x i="1"/>': '<x i="1"/> playing with <x i="0"/>',
    });
    const r = await translatePreservingSyntax(["[猫 / 犬]と遊ぶ[少女 / 少年]"], "xml", "en", fn);
    expect(r.texts).toEqual(["[girl / boy] playing with [cat / dog]"]);
  });

  it("英語出力で密着した目印に空白を補い、<x></x> 形式も受け付ける", async () => {
    const { fn } = dictFn({ ...HAIR, '<x i="0"/>の少女': 'a girl with<x i="0"></x>' });
    const r = await translatePreservingSyntax(["[黒髪 / 金髪]の少女"], "xml", "en", fn);
    expect(r.texts).toEqual(["a girl with [black hair / blonde hair]"]);
  });

  it("目印が消えたら構文以外を個別に翻訳する（フォールバック）", async () => {
    const { fn, calls } = dictFn({ ...HAIR, '<x i="0"/>の少女': "a girl with", の少女: "girl" });
    const r = await translatePreservingSyntax(["[黒髪 / 金髪]の少女"], "xml", "en", fn);
    expect(r).toEqual({ texts: ["[black hair / blonde hair] girl"], fallbackCount: 1 });
    expect(calls).toHaveLength(2);
  });

  it("XML 特殊文字をエスケープして送り、戻す", async () => {
    const { fn, calls } = dictFn({ "salt &amp; pepper": "塩 &amp; 胡椒" });
    const r = await translatePreservingSyntax(["salt & pepper"], "xml", "ja", fn);
    expect(calls[0]).toEqual(["salt &amp; pepper"]);
    expect(r.texts).toEqual(["塩 & 胡椒"]);
  });

  it("空欄・前後の空白を保持し、同じ文字列は1回だけ送る", async () => {
    const { fn, calls } = dictFn({ 猫: "cat", 犬: "dog" });
    const r = await translatePreservingSyntax(["  猫\n", "", "   ", "猫", "[猫 / 犬]"], "xml", "en", fn);
    expect(r.texts).toEqual(["  cat\n", "", "   ", "cat", "[cat / dog]"]);
    expect(calls).toEqual([["猫", "犬"]]);
  });

  it("brace 方式で本文に {0} があれば最初から個別翻訳する", async () => {
    const { fn } = dictFn({ 猫: "cat", 犬: "dog", "{0}": "{0}" });
    const r = await translatePreservingSyntax(["{0}[猫 / 犬]"], "brace", "en", fn);
    expect(r).toEqual({ texts: ["{0}[cat / dog]"], fallbackCount: 1 });
  });

  it("html 方式（Google）: notranslate の目印と改行を往復する", async () => {
    const { fn, calls } = dictFn({
      ...HAIR,
      '<span class="notranslate">#0</span>の少女<br>教室': 'a girl with <span class="notranslate">#0</span><br> classroom',
    });
    const r = await translatePreservingSyntax(["[黒髪 / 金髪]の少女\n教室"], "html", "en", fn);
    expect(calls[0]).toContain('<span class="notranslate">#0</span>の少女<br>教室');
    expect(r).toEqual({ texts: ["a girl with [black hair / blonde hair]\nclassroom"], fallbackCount: 0 });
  });

  it("html 方式: 数値・名前付き文字参照を展開し、二重展開しない", async () => {
    const { fn } = dictFn({ "猫 &amp; 犬": "cat &amp; dog&#39;s &#x2764; &amp;lt;" });
    const r = await translatePreservingSyntax(["猫 & 犬"], "html", "en", fn);
    expect(r.texts).toEqual(["cat & dog's ❤ &lt;"]);
  });
});
