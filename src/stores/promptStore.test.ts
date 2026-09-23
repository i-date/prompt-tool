import { describe, expect, it } from "vitest";
import { createEmptyDoc } from "./promptStore";

describe("createEmptyDoc", () => {
  it("区切りの初期値は改行、空行はどちらもなし", () => {
    expect(createEmptyDoc().format).toEqual({
      separator: "newline",
      blankAfterHeading: false,
      blankAfterSection: false,
    });
  });
});
