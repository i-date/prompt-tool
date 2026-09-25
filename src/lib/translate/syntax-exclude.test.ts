import { describe, expect, it } from "vitest";
import { translatePreservingSyntax } from "./syntax";

const dict: Record<string, string> = {
  金髪: "blonde hair",
  黒髪: "black hair",
  赤い目: "red eyes",
  青い目: "blue eyes",
  "{0}と{1}": "{0} and {1}",
  やった: "yay!",
  だめ: "no",
};
const fake = async (items: string[]) => items.map((s) => dict[s] ?? s);

describe("翻訳と ! 記法", () => {
  it("!相手 は訳さず、相手の訳文に置き換える", async () => {
    const r = await translatePreservingSyntax(["[金髪 / 黒髪]と[赤い目 / 青い目!金髪]"], "brace", "en", fake);
    expect(r.texts[0]).toBe("[blonde hair / black hair] and [red eyes / blue eyes!blonde hair]");
  });
  it("訳文の ! は \\! にする", async () => {
    const r = await translatePreservingSyntax(["[やった / だめ]"], "brace", "en", fake);
    expect(r.texts[0]).toBe("[yay\\! / no]");
  });
  it("\\! は ! に戻してから送り、結果は \\! に戻す", async () => {
    const seen: string[] = [];
    const r = await translatePreservingSyntax(["[すごい\\! / だめ]"], "brace", "en", async (items) => {
      seen.push(...items);
      return items;
    });
    expect(seen).toContain("すごい!");
    expect(r.texts[0]).toBe("[すごい\\! / だめ]");
  });
});
