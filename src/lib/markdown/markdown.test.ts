import { describe, expect, it } from "vitest";
import { MarkdownFormatError, parseDoc, serializeDoc } from ".";
import { DEFAULT_FORMAT } from "../doc";
import type { FormatOptions, PromptDoc, PromptSet } from "../../types";

type F = [ja: string, en: string, output: boolean];
const mkSet = (h: F, c: F, format?: Partial<FormatOptions>): PromptSet => ({
  id: crypto.randomUUID(),
  heading: { ja: h[0], en: h[1], output: h[2] },
  content: { ja: c[0], en: c[1], output: c[2] },
  ...(format ? { format } : {}),
});
/** id は取り込むたびに振り直すので比較から外す */
const withoutIds = (d: PromptDoc) => ({ ...d, sets: d.sets.map(({ id: _id, ...rest }) => rest) });

const simpleDoc = (): PromptDoc => ({
  version: 1,
  formatMode: "global",
  format: { ...DEFAULT_FORMAT },
  sets: [
    mkSet(["被写体", "Subject", true], ["[黒髪 / 金髪]の少女", "a girl with [black / blonde] hair", true]),
  ],
});

const HEADER_ONLY = "---\napp: prompt-tool\nversion: 1\n---\n";

describe("serializeDoc", () => {
  it("決まった形式の文字列を出力する", () => {
    expect(serializeDoc(simpleDoc())).toBe(
      [
        "---",
        "app: prompt-tool",
        "version: 1",
        "format-mode: global",
        "separator: newline",
        "blank-after-heading: false",
        "blank-after-section: false",
        "---",
        "",
        "## Set",
        "- heading-output: true",
        "- content-output: true",
        "",
        "### heading.ja",
        "被写体",
        "",
        "### heading.en",
        "Subject",
        "",
        "### content.ja",
        "[黒髪 / 金髪]の少女",
        "",
        "### content.en",
        "a girl with [black / blonde] hair",
        "",
        "",
      ].join("\n"),
    );
  });
});

describe("保存 → 取り込みの往復", () => {
  it("改行・空白・目印と同じ行・個別書式を含んでも元に戻る", () => {
    const doc: PromptDoc = {
      version: 1,
      formatMode: "perSet",
      format: { separator: "comma", blankAfterHeading: true, blankAfterSection: false },
      sets: [
        mkSet(["被写体", "Subject", false], ["1行目\n\n3行目\n", "  spaced  ", true], {
          separator: "comma",
          blankAfterSection: true,
        }),
        mkSet(["", "", true], ["## Set\n\\## Set\n### content.en", "---\n\\", false]),
        mkSet(["見出し", "Heading", true], ["", "\n\n", true], { blankAfterHeading: false }),
      ],
    };
    expect(withoutIds(parseDoc(serializeDoc(doc)))).toEqual(withoutIds(doc));
  });
  it("セットが0件でも元に戻る", () => {
    const doc: PromptDoc = { ...simpleDoc(), sets: [] };
    expect(withoutIds(parseDoc(serializeDoc(doc)))).toEqual(withoutIds(doc));
  });
});

describe("parseDoc", () => {
  it("CRLF・BOM付きでも読み込める", () => {
    const text = `\uFEFF${serializeDoc(simpleDoc()).replace(/\n/g, "\r\n")}`;
    expect(withoutIds(parseDoc(text))).toEqual(withoutIds(simpleDoc()));
  });
  it("ヘッダーに書式が無ければ既定値（改行・全体で1つ）", () => {
    const d = parseDoc(HEADER_ONLY);
    expect(d.format).toEqual(DEFAULT_FORMAT);
    expect(d.formatMode).toBe("global");
    expect(d.sets).toEqual([]);
  });
  it("空行を省いた手編集のファイルも読み込める", () => {
    const d = parseDoc(`${HEADER_ONLY}## Set\n### content.en\nhello\n### heading.en\nTitle`);
    expect(d.sets[0].content.en).toBe("hello");
    expect(d.sets[0].heading.en).toBe("Title");
    expect(d.sets[0].heading.output).toBe(true);
  });
});

describe("parseDoc：エラー", () => {
  it("先頭に --- が無い", () => {
    expect(() => parseDoc("## Set\n")).toThrow(MarkdownFormatError);
  });
  it("app が違う", () => {
    expect(() => parseDoc("---\napp: other\nversion: 1\n---\n")).toThrow(MarkdownFormatError);
  });
  it("未対応のバージョン", () => {
    expect(() => parseDoc("---\napp: prompt-tool\nversion: 2\n---\n")).toThrow(MarkdownFormatError);
  });
  it("真偽値が不正", () => {
    expect(() => parseDoc(`${HEADER_ONLY}## Set\n- heading-output: yes\n`)).toThrow(MarkdownFormatError);
  });
});
