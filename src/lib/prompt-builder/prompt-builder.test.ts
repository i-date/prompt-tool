import { describe, expect, it } from "vitest";
import { buildPrompt } from ".";
import type { FormatOptions, PromptDoc, PromptSet } from "../../types";

const mk = (
  id: string,
  heading: string,
  content: string,
  opts: { headingOut?: boolean; contentOut?: boolean; format?: Partial<FormatOptions> } = {},
): PromptSet => ({
  id,
  heading: { ja: heading, en: heading, output: opts.headingOut ?? true },
  content: { ja: content, en: content, output: opts.contentOut ?? true },
  format: opts.format,
});

const doc = (
  sets: PromptSet[],
  format: Partial<FormatOptions> = {},
  formatMode: PromptDoc["formatMode"] = "global",
): PromptDoc => ({
  version: 1,
  formatMode,
  format: { separator: "comma", blankAfterHeading: false, blankAfterSection: false, ...format },
  sets,
});

describe("buildPrompt：基本", () => {
  it("見出しは単独行、見出しの無いセットはカンマでつなぐ", () => {
    const d = doc([mk("1", "Subject", "girl"), mk("2", "", "smile"), mk("3", "BG", "room")]);
    expect(buildPrompt(d, {}, "en")).toBe("Subject\ngirl, smile\nBG\nroom");
  });
  it("見出しの出力がOFFなら内容だけを出す", () => {
    const d = doc([mk("1", "Subject", "girl", { headingOut: false }), mk("2", "", "smile")]);
    expect(buildPrompt(d, {}, "en")).toBe("girl, smile");
  });
  it("両方OFFのセットと空のセットはスキップする", () => {
    const d = doc([
      mk("1", "", "a"),
      mk("2", "H", "b", { headingOut: false, contentOut: false }),
      mk("3", "", ""),
      mk("4", "", "c"),
    ]);
    expect(buildPrompt(d, {}, "en")).toBe("a, c");
  });
  it("改行区切り", () => {
    const d = doc([mk("1", "", "a"), mk("2", "", "b")], { separator: "newline" });
    expect(buildPrompt(d, {}, "en")).toBe("a\nb");
  });
  it("ランダム選択の抽選結果を反映する", () => {
    const d = doc([mk("1", "", "[x / y]")]);
    expect(buildPrompt(d, { "1": { ja: [1], en: [1] } }, "ja")).toBe("y");
  });
  it("【不具合修正】見出しだけのセットの後はカンマでも改行する", () => {
    const d = doc([mk("1", "Subject", "girl", { contentOut: false }), mk("2", "", "smile")]);
    expect(buildPrompt(d, {}, "en")).toBe("Subject\nsmile");
  });
});

describe("buildPrompt：空行", () => {
  it("見出し後に空行", () => {
    const d = doc([mk("1", "Subject", "girl")], { blankAfterHeading: true });
    expect(buildPrompt(d, {}, "en")).toBe("Subject\n\ngirl");
  });
  it("見出しだけのセットには見出し後の空行を入れない", () => {
    const d = doc([mk("1", "Subject", "")], { blankAfterHeading: true });
    expect(buildPrompt(d, {}, "en")).toBe("Subject");
  });
  it("セクション後に空行（カンマより優先）", () => {
    const d = doc([mk("1", "", "a"), mk("2", "", "b")], { blankAfterSection: true });
    expect(buildPrompt(d, {}, "en")).toBe("a\n\nb");
  });
});

describe("buildPrompt：セットごとの書式", () => {
  const sets = () => [
    mk("1", "", "a", { format: { separator: "newline", blankAfterSection: false } }),
    mk("2", "", "b"),
    mk("3", "", "c"),
  ];
  it("perSet：個別指定を優先し、未指定は全体の設定に従う", () => {
    const d = doc(sets(), { blankAfterSection: true }, "perSet");
    expect(buildPrompt(d, {}, "en")).toBe("a\nb\n\nc");
  });
  it("global：個別指定を無視する", () => {
    const d = doc(sets(), { blankAfterSection: true }, "global");
    expect(buildPrompt(d, {}, "en")).toBe("a\n\nb\n\nc");
  });
  it("perSet：見出し後の空行を個別にON", () => {
    const d = doc(
      [mk("1", "H1", "a", { format: { blankAfterHeading: true } }), mk("2", "H2", "b")],
      {},
      "perSet",
    );
    expect(buildPrompt(d, {}, "en")).toBe("H1\n\na\nH2\nb");
  });
});

describe("buildPrompt：トリム", () => {
  it("ON（既定）：内容の前後の空白・改行を取り除く", () => {
    const d = doc([mk("1", "", "  a \n"), mk("2", "", " b")]);
    expect(buildPrompt(d, {}, "en")).toBe("a, b");
  });
  it("OFF：内容を入力のまま出力する", () => {
    const d = doc([mk("1", "", "  a  "), mk("2", "", "b ")]);
    expect(buildPrompt(d, {}, "en", { trimContent: false })).toBe("  a  , b ");
  });
  it("OFFでも空白だけの内容はスキップする", () => {
    const d = doc([mk("1", "", "   "), mk("2", "", "b")]);
    expect(buildPrompt(d, {}, "en", { trimContent: false })).toBe("b");
  });
});

describe("buildPrompt：見出しを使わない（headings: false）", () => {
  const off = { trimContent: true, headings: false };
  it("見出しを出さず、内容を区切り設定でつなぐ", () => {
    const d = doc([mk("1", "Subject", "girl"), mk("2", "BG", "room")]);
    expect(buildPrompt(d, {}, "en", off)).toBe("girl, room");
  });
  it("見出しだけのセットはスキップする", () => {
    const d = doc([mk("1", "Subject", ""), mk("2", "", "smile")]);
    expect(buildPrompt(d, {}, "en", off)).toBe("smile");
  });
  it("見出し後の空行も入らない", () => {
    const d = doc([mk("1", "Subject", "girl")], { blankAfterHeading: true });
    expect(buildPrompt(d, {}, "en", off)).toBe("girl");
  });
  it("指定しなければ従来どおり見出しを出す", () => {
    const d = doc([mk("1", "Subject", "girl")]);
    expect(buildPrompt(d, {}, "en", { trimContent: true })).toBe("Subject\ngirl");
  });
});
