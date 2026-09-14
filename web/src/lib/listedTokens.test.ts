import { describe, expect, it } from "vitest";
import { isListedToken, uniqueBySymbol } from "./listedTokens";

describe("listed tokens", () => {
  it("keeps pooled symbols and the major whitelist", () => {
    expect(isListedToken("USDC", false)).toBe(true);
    expect(isListedToken("MEME", false)).toBe(false);
    expect(isListedToken("MEME", true)).toBe(true);
  });
  it("drops duplicate symbols", () => {
    expect(uniqueBySymbol([{ symbol: "USDC" }, { symbol: "usdc" }, { symbol: "BTC" }]).map((x) => x.symbol)).toEqual([
      "USDC",
      "BTC",
    ]);
  });
});
