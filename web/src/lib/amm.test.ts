import { describe, expect, it } from "vitest";
import { amountOut, lpFeeAprPct, mulDiv, mulDivCeil, quoteLocal } from "./amm";
import type { Pool } from "../types";

const pool: Pool = {
  id: "ugnot|ZTT",
  symbol: "ZTT",
  name: "ZDEX Test",
  reserveU: "982149509",
  reserveT: "711351866",
  virtualU: "3500000000",
  totalLP: "0",
  feeBps: 100,
  launched: true,
  unlockH: "0",
  snipeUntil: "0",
  snipeMaxBps: "200",
  creator: "",
  decimals: 6,
  quote1gnot: "157085",
  spark: [],
};

describe("mulDiv", () => {
  it("floor divides", () => {
    expect(mulDiv(10n, 3n, 2n)).toBe(15n);
    expect(mulDiv(1n, 1n, 3n)).toBe(0n);
  });
  it("ceil divides", () => {
    expect(mulDivCeil(1n, 1n, 3n)).toBe(1n);
  });
});

describe("lpFeeAprPct", () => {
  it("is null without volume", () => {
    expect(lpFeeAprPct(pool)).toBeNull();
  });
  it("scales with volume and fee", () => {
    const n = lpFeeAprPct({ ...pool, launched: false, feeBps: 30, volumeU: "982149509" });
    expect(n).not.toBeNull();
    expect(n as number).toBeGreaterThan(5);
  });
});

describe("amountOut", () => {
  it("returns 0 on empty input", () => {
    expect(amountOut(0n, 1n, 0n, 1n, 0n, 30n)).toBe(0n);
  });
  it("buys ZTT with 1 GNOT against virtual+real", () => {
    const out = quoteLocal(pool, "ugnot", 1_000_000n);
    expect(out).toBeGreaterThan(100_000n);
    expect(out).toBeLessThan(200_000n);
  });
});
