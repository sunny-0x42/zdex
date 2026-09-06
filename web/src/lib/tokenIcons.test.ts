import { describe, expect, it } from "vitest";
import { tokenIconSrc, tokenInitials, normalizeSymbol } from "./tokenIcons";

describe("token icons", () => {
  it("maps official tickers to local assets", () => {
    expect(tokenIconSrc("GNOT")).toBe("/tokens/gnot.svg");
    expect(tokenIconSrc("ugnot")).toBe("/tokens/gnot.svg");
    expect(tokenIconSrc("USDC")).toBe("/tokens/usdc.svg");
    expect(tokenIconSrc("USDT")).toBe("/tokens/usdt.svg");
    expect(tokenIconSrc("ATONE")).toBe("/tokens/atone.svg");
    expect(tokenIconSrc("BTC")).toBe("/tokens/btc.svg");
    expect(tokenIconSrc("ETH")).toBe("/tokens/eth.svg");
    expect(tokenIconSrc("WETH")).toBe("/tokens/eth.svg");
  });
  it("uses ticker letters when no official icon", () => {
    expect(tokenIconSrc("MEME")).toBeNull();
    expect(tokenInitials("MEME")).toBe("MEME");
    expect(tokenInitials("SUPERLONG")).toBe("SUPE");
    expect(normalizeSymbol(" usdc ")).toBe("USDC");
  });
});
