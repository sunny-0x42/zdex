import { describe, expect, it } from "vitest";
import { fmtGnot, parseUgnot, toUgnot } from "./format";

describe("gnot units", () => {
  it("parses and formats round-trip", () => {
    expect(toUgnot("1")).toBe(1_000_000n);
    expect(toUgnot("1.5")).toBe(1_500_000n);
    expect(fmtGnot(1_000_000n)).toBe("1");
    expect(parseUgnot("982149509ugnot")).toBe(982149509n);
  });
});
