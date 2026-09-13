import type { Order } from "../types";

/** Limit as GNOT per token when both legs are 6-dec base units. */
export function bookPriceGnotPerToken(o: Pick<Order, "side" | "giveAmt" | "wantAmt">): number {
  const g = Number(o.giveAmt);
  const w = Number(o.wantAmt);
  if (!(g > 0) || !(w > 0)) return 0;
  return o.side === "bid" ? g / w : w / g;
}

export function splitBook(orders: Order[] | undefined, poolId: string | undefined): { bids: Order[]; asks: Order[] } {
  const rows = (orders || []).filter((o) => !poolId || o.pool === poolId);
  const bids = rows.filter((o) => o.side === "bid").sort((a, b) => bookPriceGnotPerToken(b) - bookPriceGnotPerToken(a));
  const asks = rows.filter((o) => o.side === "ask").sort((a, b) => bookPriceGnotPerToken(a) - bookPriceGnotPerToken(b));
  return { bids, asks };
}

export function bests(bids: Order[], asks: Order[]): { bid: number; ask: number; mid: number } {
  const bid = bids[0] ? bookPriceGnotPerToken(bids[0]) : 0;
  const ask = asks[0] ? bookPriceGnotPerToken(asks[0]) : 0;
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : bid || ask;
  return { bid, ask, mid };
}

export function ammGnotPerToken(reserveU: string | number | undefined, reserveT: string | number | undefined): number {
  const u = Number(reserveU);
  const t = Number(reserveT);
  if (!(u > 0) || !(t > 0)) return 0;
  return u / t;
}
