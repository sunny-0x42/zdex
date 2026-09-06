import { useDex } from "../context";
import { fmtApr, lpFeeAprPct } from "../lib/amm";
import { fmtGnot, fmtInt } from "../lib/format";
import { PairAvatars } from "./TokenAvatar";

export default function Featured() {
  const { featured, tradePool, d } = useDex();
  if (!featured) return null;
  return (
    <div className="featured">
      <PairAvatars symbol={featured.symbol || "ZT"} />
      <div className="feat-copy">
        <b>
          {featured.symbol} / GNOT
        </b>
        <div className="muted">
          {featured.name} · TVL {fmtGnot(featured.reserveU)} GNOT
        </div>
      </div>
      <div className="feat-stats">
        <div>
          <span>1 GNOT</span>
          <b>
            {fmtInt(featured.quote1gnot)} {featured.symbol}
          </b>
        </div>
        <div>
          <span>{d.volume}</span>
          <b>{fmtGnot(featured.volumeU || "0")}</b>
        </div>
        <div>
          <span>{d.feeApr}</span>
          <b>{fmtApr(lpFeeAprPct(featured))}</b>
        </div>
      </div>
      <button className="btn primary sm" type="button" onClick={() => tradePool(featured.id)}>
        {d.trade}
      </button>
    </div>
  );
}
