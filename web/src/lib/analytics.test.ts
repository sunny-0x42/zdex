import { describe, expect, it } from "vitest";
import { feeTierLabel, gaugeFundedU, poolTvlU, poolVolumeU, splitOrders } from "./analytics";
import type { Gauge, Order, Pool } from "../types";

const p = (partial: Partial<Pool> & Pick<Pool, "id" | "symbol">): Pool =>
  ({
    name: partial.symbol,
    reserveU: "0",
    reserveT: "0",
    virtualU: "0",
    totalLP: "0",
    feeBps: 30,
    launched: false,
    unlockH: "0",
    snipeUntil: "0",
    snipeMaxBps: "0",
    creator: "",
    decimals: 6,
    quote1gnot: "0",
    spark: [],
    ...partial,
  }) as Pool;

describe("analytics", () => {
  it("sums TVL and 24h volume in ugnot", () => {
    const pools = [p({ id: "a", symbol: "A", reserveU: "300000000", volumeU: "1000" }), p({ id: "b", symbol: "B", reserveU: "1000000", volumeU: "500" })];
    expect(poolTvlU(pools)).toBe(301000000);
    expect(poolVolumeU(pools)).toBe(1500);
  });
  it("labels fee tiers and funded gauges", () => {
    expect(feeTierLabel(30)).toBe("0.30%");
    expect(gaugeFundedU([{ id: "x", acc: "0", totalFunded: "100000000", on: true, paused: false } as Gauge])).toBe(100000000);
    expect(splitOrders([{ side: "bid" }, { side: "ask" }, { side: "ask" }] as Order[])).toEqual({ bids: 1, asks: 2 });
  });
});
