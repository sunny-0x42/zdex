import { describe, expect, it } from "vitest";
import { ammGnotPerToken, bests, bookPriceGnotPerToken, splitBook } from "./book";
import type { Order } from "../types";

function o(partial: Partial<Order> & Pick<Order, "id" | "side" | "giveAmt" | "wantAmt">): Order {
  return {
    pool: "ugnot|ZDEX",
    expireH: "0",
    allOrNone: false,
    maker: "g1a",
    price: 0,
    ...partial,
  };
}

describe("book", () => {
  it("filters to the selected pool and sorts bids down / asks up", () => {
    const { bids, asks } = splitBook(
      [
        o({ id: "1", side: "bid", giveAmt: "2000000", wantAmt: "1000", pool: "ugnot|ZDEX" }),
        o({ id: "2", side: "bid", giveAmt: "1000000", wantAmt: "1000", pool: "ugnot|ZDEX" }),
        o({ id: "3", side: "ask", giveAmt: "1000", wantAmt: "3000000", pool: "ugnot|ZDEX" }),
        o({ id: "4", side: "ask", giveAmt: "1000", wantAmt: "4000000", pool: "ugnot|OTHER" }),
      ],
      "ugnot|ZDEX",
    );
    expect(bids.map((x) => x.id)).toEqual(["1", "2"]);
    expect(asks.map((x) => x.id)).toEqual(["3"]);
    expect(bookPriceGnotPerToken(bids[0])).toBeGreaterThan(bookPriceGnotPerToken(bids[1]));
  });

  it("computes mid vs AMM without calling it a fee", () => {
    const bids = [o({ id: "1", side: "bid", giveAmt: "2000000", wantAmt: "1000" })];
    const asks = [o({ id: "2", side: "ask", giveAmt: "1000", wantAmt: "3000000" })];
    const b = bests(bids, asks);
    expect(b.bid).toBe(2000);
    expect(b.ask).toBe(3000);
    expect(b.mid).toBe(2500);
    expect(ammGnotPerToken("300000000", "300000000000")).toBeCloseTo(0.001, 8);
  });
});
