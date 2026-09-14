import { describe, expect, it } from "vitest";
import { fmtUsd, gnotUsdFromPools, poolTvlUsd, ugnotToUsd } from "./usd";
import type { Pool } from "../types";

const usdc = {
  id: "ugnot|USDC",
  symbol: "USDC",
  reserveU: "769230769231",
  reserveT: "500000000000",
} as Pool;

describe("usd mark from USDC pool", () => {
  it("reads GNOT at $0.65 from 6-dec reserves", () => {
    const px = gnotUsdFromPools([usdc]);
    expect(px).toBeCloseTo(0.65, 5);
    expect(fmtUsd(px)).toBe("$0.6500");
    expect(ugnotToUsd("1000000", px)).toBeCloseTo(0.65, 5);
    expect(poolTvlUsd(usdc, px)).toBeCloseTo(1_000_000, 0);
  });
  it("formats millions", () => {
    expect(fmtUsd(6_000_000)).toBe("$6.00M");
  });
});
