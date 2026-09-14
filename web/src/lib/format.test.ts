import { describe, expect, it } from "vitest";
import { fmtGnot, fmtToken, parseUgnot, toTokenBase, toUgnot, tokenPkgFromKey } from "./format";

describe("gnot units", () => {
  it("parses and formats round-trip", () => {
    expect(toUgnot("1")).toBe(1_000_000n);
    expect(toUgnot("1.5")).toBe(1_500_000n);
    expect(fmtGnot(1_000_000n)).toBe("1");
    expect(fmtToken(650000n, 6)).toBe("0.65");
    expect(fmtToken(637000n, 6)).toBe("0.637");
    expect(parseUgnot("982149509ugnot")).toBe(982149509n);
  });
  it("scales GRC20 amounts and derives token pkg from registry key", () => {
    expect(toTokenBase("300000", 6)).toBe(300000000000n);
    expect(toTokenBase("1.5", 6)).toBe(1500000n);
    expect(toTokenBase("10", 0)).toBe(10n);
    expect(tokenPkgFromKey("gno.land/r/g1abc/zdex/token.ZDEX")).toBe("gno.land/r/g1abc/zdex/token");
    expect(tokenPkgFromKey("gno.land/r/g1abc/zdex/token.ZDEX.0000000")).toBe("gno.land/r/g1abc/zdex/token");
    expect(tokenPkgFromKey("ZDEX")).toBe("");
  });
});
