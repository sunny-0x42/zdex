import { useDex } from "../context";
import { fmtInt } from "../lib/format";

export default function Ticker() {
  const { pools, d } = useDex();
  if (!pools.length) {
    return (
      <div className="ticker">
        <div className="ticker-track">
          <span className="muted">{d.noMarkets}</span>
        </div>
      </div>
    );
  }
  const items = pools.map((p) => {
    const spark = p.spark || [];
    const prev = spark.length > 1 ? spark[spark.length - 2] : spark[0] || 0;
    const now = Number(p.quote1gnot) || 0;
    return (
      <span className="tick" key={p.id}>
        <span>{p.symbol}</span>
        <b className={now >= prev ? "up" : "dn"}>{fmtInt(p.quote1gnot)} / GNOT</b>
      </span>
    );
  });
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items}
        {items}
      </div>
    </div>
  );
}
