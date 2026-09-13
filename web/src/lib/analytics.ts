import type { Gauge, Order, Pool } from "../types";

export function sumUgnot(values: Array<string | number | undefined>): number {
  let s = 0;
  for (const v of values) s += Number(v) || 0;
  return s;
}

export function poolTvlU(pools: Pool[] | undefined): number {
  return sumUgnot((pools || []).map((p) => p.reserveU));
}

export function poolVolumeU(pools: Pool[] | undefined): number {
  return sumUgnot((pools || []).map((p) => p.volumeU));
}

/** Estimated swap fees from 24h |ΔreserveU| × feeBps. Not on-chain. */
export function feeEstU(pools: Pool[] | undefined): number {
  let s = 0;
  for (const p of pools || []) {
    const vol = Number(p.volumeU) || 0;
    const bps = Number(p.feeBps) || 0;
    s += (vol * bps) / 10000;
  }
  return s;
}

export function feeTierLabel(bps: number | undefined): string {
  if (bps == null || Number.isNaN(bps)) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

export function gaugeFundedU(gauges: Gauge[] | undefined): number {
  return sumUgnot((gauges || []).filter((g) => g.on).map((g) => g.totalFunded));
}

export function splitOrders(orders: Order[] | undefined): { bids: number; asks: number } {
  const rows = orders || [];
  return {
    bids: rows.filter((o) => o.side === "bid").length,
    asks: rows.filter((o) => o.side === "ask").length,
  };
}
