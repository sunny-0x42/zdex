import { useState } from "react";
import { useDex } from "../context";
import { ammGnotPerToken, bests, bookPriceGnotPerToken, splitBook } from "../lib/book";
import { fmtGnot, fmtInt, toTokenBase, toUgnot } from "../lib/format";
import type { Order } from "../types";

export default function Orders() {
  const { live, pools, pool, setPoolId, busy, runTx, call, d, walletAddr } = useDex();
  const [side, setSide] = useState<"bid" | "ask">("bid");
  const [gnotAmt, setGnotAmt] = useState("1");
  const [tokAmt, setTokAmt] = useState("1000");
  const [exp, setExp] = useState("0");
  const decimals = pool?.decimals || 6;
  const { bids, asks } = splitBook(live.orders, pool?.id);
  const { bid, ask, mid } = bests(bids, asks);
  const amm = pool ? ammGnotPerToken(pool.reserveU, pool.reserveT) : 0;
  const giveU = toUgnot(gnotAmt);
  const giveT = toTokenBase(tokAmt, decimals);
  const px = side === "bid" ? (giveT > 0n ? Number(giveU) / Number(giveT) : 0) : giveT > 0n ? Number(giveU) / Number(giveT) : 0;

  function fill(o: Order) {
    const pay = o.wantAmt;
    return runTx("Fill", () => call("FillOrder", [o.id, pay], o.side === "ask" ? `${pay}ugnot` : "")).catch(() => {});
  }

  return (
    <section className="grid">
      <div className="card">
        <h2>{d.placeOrder}</h2>
        <label>{d.pool}</label>
        <select value={pool?.id || ""} onChange={(e) => setPoolId(e.target.value)}>
          {pools.map((p) => (
            <option key={p.id} value={p.id}>
              {p.symbol} / GNOT
            </option>
          ))}
        </select>
        <label>{d.side}</label>
        <select value={side} onChange={(e) => setSide(e.target.value as "bid" | "ask")}>
          <option value="bid">{d.bid}</option>
          <option value="ask">{d.ask}</option>
        </select>
        <div className="pair">
          <div>
            <label>GNOT</label>
            <input type="number" min="0" step="any" value={gnotAmt} onChange={(e) => setGnotAmt(e.target.value)} />
          </div>
          <div>
            <label>{pool?.symbol || d.tokenSide}</label>
            <input type="number" min="0" step="any" value={tokAmt} onChange={(e) => setTokAmt(e.target.value)} />
          </div>
        </div>
        <label>{d.expire}</label>
        <input type="number" value={exp} onChange={(e) => setExp(e.target.value)} />
        <p className="hint">
          {d.limitPx} {px > 0 ? px.toPrecision(6) : "—"} GNOT
        </p>
        <button
          className="btn primary wide"
          type="button"
          disabled={!!busy || !pool || giveU <= 0n || giveT <= 0n}
          onClick={() =>
            void runTx("Order", () =>
              call(
                side === "bid" ? "PlaceBid" : "PlaceAsk",
                [pool!.id, side === "bid" ? giveU.toString() : giveT.toString(), side === "bid" ? giveT.toString() : giveU.toString(), exp.trim(), "false"],
                side === "bid" ? `${giveU.toString()}ugnot` : "",
              ),
            ).catch(() => {})
          }
        >
          {busy || d.placeOrder}
        </button>
        <p className="hint">{d.noFeeFill}</p>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>{d.openOrders}</h2>
          <span className="muted">{bids.length + asks.length}</span>
        </div>
        {pool ? (
          <div className="book-mid">
            <span>
              {d.bids} <b>{bid > 0 ? bid.toPrecision(6) : "—"}</b>
            </span>
            <span>
              {d.asks} <b>{ask > 0 ? ask.toPrecision(6) : "—"}</b>
            </span>
            <span>
              {d.mid} <b>{mid > 0 ? mid.toPrecision(6) : "—"}</b>
            </span>
            <span>
              {d.ammPx} <b>{amm > 0 ? amm.toPrecision(6) : "—"}</b>
            </span>
          </div>
        ) : null}
        {!bids.length && !asks.length ? (
          <div className="book-empty">
            <p className="muted">{d.emptyOrdersBody}</p>
          </div>
        ) : (
          <div className="book-grid">
            <BookCol title={d.bids} rows={bids} kind="bid" poolSym={pool?.symbol || ""} walletAddr={walletAddr} d={d} busy={busy} onFill={fill} onCancel={(id) => void runTx("Cancel", () => call("CancelOrder", [id])).catch(() => {})} />
            <BookCol title={d.asks} rows={asks} kind="ask" poolSym={pool?.symbol || ""} walletAddr={walletAddr} d={d} busy={busy} onFill={fill} onCancel={(id) => void runTx("Cancel", () => call("CancelOrder", [id])).catch(() => {})} />
          </div>
        )}
      </div>
    </section>
  );
}

function BookCol({
  title,
  rows,
  kind,
  poolSym,
  walletAddr,
  d,
  busy,
  onFill,
  onCancel,
}: {
  title: string;
  rows: Order[];
  kind: "bid" | "ask";
  poolSym: string;
  walletAddr?: string;
  busy: string;
  d: { size: string; fillThis: string; cancelOrder: string; yours: string };
  onFill: (o: Order) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="book-col">
      <h3 className={kind === "bid" ? "side-bid" : "side-ask"}>{title}</h3>
      {!rows.length ? (
        <p className="muted">{d.size} —</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="r">GNOT</th>
                <th className="r">{d.size}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const px = bookPriceGnotPerToken(o);
                const mine = Boolean(walletAddr && o.maker === walletAddr);
                const size = kind === "bid" ? fmtInt(o.wantAmt) : fmtInt(o.giveAmt);
                return (
                  <tr key={o.id} className={mine ? "book-yours" : ""}>
                    <td className="r mono">{px > 0 ? px.toPrecision(6) : "—"}</td>
                    <td className="r">
                      {size} {poolSym}
                      {mine ? <span className="muted"> · {d.yours}</span> : null}
                    </td>
                    <td>
                      <button className="btn ghost sm" type="button" disabled={!!busy} onClick={() => onFill(o)}>
                        {d.fillThis}
                      </button>
                      {mine ? (
                        <button className="btn ghost sm" type="button" disabled={!!busy} onClick={() => onCancel(o.id)}>
                          {d.cancelOrder}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
