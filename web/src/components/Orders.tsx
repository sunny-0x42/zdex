import { useState } from "react";
import { useDex } from "../context";
import { fmtInt } from "../lib/format";

export default function Orders() {
  const { live, pools, pool, setPoolId, busy, runTx, call, d } = useDex();
  const [side, setSide] = useState("bid");
  const [give, setGive] = useState("1000000");
  const [want, setWant] = useState("100000");
  const [exp, setExp] = useState("0");
  const [fillAmt, setFillAmt] = useState("");
  const orders = live.orders || [];
  const g = Number(give) || 0;
  const w = Number(want) || 0;

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
        <select value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="bid">{d.bid}</option>
          <option value="ask">{d.ask}</option>
        </select>
        <div className="pair">
          <div>
            <label>{d.give}</label>
            <input type="number" value={give} onChange={(e) => setGive(e.target.value)} />
          </div>
          <div>
            <label>{d.want}</label>
            <input type="number" value={want} onChange={(e) => setWant(e.target.value)} />
          </div>
        </div>
        <label>{d.expire}</label>
        <input type="number" value={exp} onChange={(e) => setExp(e.target.value)} />
        <p className="hint">{g > 0 ? `${d.limitPx} ${(w / g).toPrecision(6)}` : d.limitPx}</p>
        <button
          className="btn primary wide"
          type="button"
          disabled={!!busy || !pool}
          onClick={() =>
            void runTx("Order", () =>
              call(side === "bid" ? "PlaceBid" : "PlaceAsk", [pool!.id, give.trim(), want.trim(), exp.trim(), "false"], side === "bid" ? `${give}ugnot` : ""),
            ).catch(() => {})
          }
        >
          {busy || d.placeOrder}
        </button>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>{d.openOrders}</h2>
          <span className="muted">{orders.length}</span>
        </div>
        {!orders.length ? (
          <div className="book-empty">
            <img className="empty-art" src="/empty-orders.jpg" alt="" />
            <p className="muted">{d.emptyOrdersBody}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>id</th>
                    <th>side</th>
                    <th className="r">{d.give}</th>
                    <th className="r">{d.want}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="mono">{o.id}</td>
                      <td className={`side-${o.side}`}>{o.side}</td>
                      <td className="r">{fmtInt(o.giveAmt)}</td>
                      <td className="r">{fmtInt(o.wantAmt)}</td>
                      <td>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() =>
                            void runTx("Fill", () =>
                              call("FillOrder", [o.id, fillAmt.trim() || "1000000"], o.side === "ask" ? `${fillAmt.trim() || "1000000"}ugnot` : ""),
                            ).catch(() => {})
                          }
                        >
                          {d.fill}
                        </button>
                        <button className="btn ghost" type="button" onClick={() => void runTx("Cancel", () => call("CancelOrder", [o.id])).catch(() => {})}>
                          {d.cancelOrder}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fill-row">
              <input type="number" placeholder="Fill amount" value={fillAmt} onChange={(e) => setFillAmt(e.target.value)} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
