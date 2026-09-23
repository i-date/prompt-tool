import { describe, expect, it } from "vitest";
import { parseCsvText, toCsvText } from "./csv";
import { csvToPayload } from "./transfer";

describe("csv", () => {
  it("カンマ・引用符・改行・前後空白を含むセルを往復できる", () => {
    const rows = [["a,b", 'say "hi"', "line1\nline2", " pad"]];
    expect(parseCsvText(toCsvText(rows))).toEqual(rows);
  });
  it("BOM・CRLF・空行を処理する", () => {
    expect(parseCsvText("\uFEFFja,en\r\n黒髪,black hair\r\n\r\n")).toEqual([["ja", "en"], ["黒髪", "black hair"]]);
  });
  it("閉じていない引用符はエラー", () => {
    expect(() => parseCsvText('a,"b\n')).toThrow();
  });
  it("日本語見出し・列順違い・候補の偽値を解釈する", () => {
    const p = csvToPayload("英語,日本語,候補,カテゴリ,タグ\r\nsmile,笑顔,対象外,表情,明るい;人物\r\nclassroom,教室,,,\r\n");
    expect(p.phrases).toEqual([
      { ja: "笑顔", en: "smile", categoryName: "表情", tags: ["明るい", "人物"], candidate: false },
      { ja: "教室", en: "classroom", categoryName: null, tags: [], candidate: true },
    ]);
    expect(p.categories).toEqual([{ name: "表情", candidate: true }]);
  });
});
