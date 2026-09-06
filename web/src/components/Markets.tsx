import { useDex } from "../context";
import { lpFeeAprPct } from "../lib/amm";
import { fmtGnot, fmtInt } from "../lib/format";
import Spark from "./Spark";

export default function Markets() {
  const { pools, tradePool, addLp, d } = useDex();
  if (!pools.length) {
    return <div className="empty">{d.noMarkets}</div>;
  }
  return (
    <section>
      <div className="mkt-grid mkt-cards">
        {pools.map((p) => (
          <article key={p.id} className="mkt-card" onClick={() => tradePool(p.id)}>
            <div className="mkt-top">
              <div className="tok-av">{(p.symbol || "?").slice(0, 2).toUpperCase()}</div>
              <div>
                <b>{p.symbol}/GNOT</b>
                <div className="muted">{p.name}</div>
              </div>
            </div>
            <div className="px">
              {fmtInt(p.quote1gnot)} <span className="muted">{p.symbol}</span>
            </div>
            <div className="muted mkt-meta">
              {fmtGnot(p.reserveU)} GNOT · {p.feeBps / 100}% · APR {lpFeeAprPct(p) == null ? "—" : `${lpFeeAprPct(p)!.toFixed(1)}%`}
            </div>
            <Spark className="mini-spark" values={p.spark || []} w={240} h={36} />
            <button
              className="btn sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addLp(p.id);
              }}
            >
              {d.canAdd}
            </button>
          </article>
        ))}
      </div>
      <div className="card mkt-table">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{d.pair}</th>
                <th className="r">Price</th>
                <th className="r">TVL</th>
                <th className="r">{d.volume}</th>
                <th className="r">{d.fee}</th>
                <th className="r">{d.feeApr}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button className="link" type="button" onClick={() => tradePool(p.id)}>
                      {p.symbol}/GNOT
                    </button>
                    <div className="muted">{p.name}</div>
                  </td>
                  <td className="r mono">{fmtInt(p.quote1gnot)}</td>
                  <td className="r">{fmtGnot(p.reserveU)}</td>
                  <td className="r">{fmtGnot(p.volumeU || "0")}</td>
                  <td className="r">{p.feeBps / 100}%</td>
                  <td className="r">{lpFeeAprPct(p) == null ? "—" : `${lpFeeAprPct(p)!.toFixed(1)}%`}</td>
                  <td className="r">
                    <button className="btn sm" type="button" onClick={() => addLp(p.id)}>
                      {d.canAdd}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
