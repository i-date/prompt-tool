const NEEDS_QUOTE = /[",\r\n]/;

export function escapeCsv(v: string): string {
  return NEEDS_QUOTE.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsvText(rows: string[][]): string {
  return `${rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

/** RFC 4180 準拠のパーサ（BOM・CRLF/LF・セル内改行に対応、空行は捨てる） */
export function parseCsvText(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      quoted = true;
      i++;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\r" || ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += ch === "\r" && s[i + 1] === "\n" ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }
  if (quoted) throw new Error('CSV の引用符（"）が閉じられていません');
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
