import { useDex } from "../context";
import { fmtApr, lpFeeAprPct } from "../lib/amm";
import { fmtGnot, fmtToken } from "../lib/format";
import { fmtUsd, gnotUsdFromPools, poolTvlUsd, tokenUsd, ugnotToUsd } from "../lib/usd";
import { PairAvatars } from "./TokenAvatar";

export default function Featured() {
  const { featured, tradePool, d, pools } = useDex();
  const gnotUsd = gnotUsdFromPools(pools);
  if (!featured) return null;
  return (
    <div className="featured">
      <PairAvatars symbol={featured.symbol || "ZT"} />
      <div className="feat-copy">
        <b>
          {featured.symbol} / GNOT
        </b>
        <div className="muted">
          {featured.name} · TVL {fmtUsd(poolTvlUsd(featured, gnotUsd))} · {fmtGnot(featured.reserveU)} GNOT
        </div>
      </div>
      <div className="feat-stats">
        <div>
          <span>1 GNOT</span>
          <b>
            {fmtUsd(tokenUsd(featured, gnotUsd))}
            <div className="muted">
              {fmtToken(featured.quote1gnot, featured.decimals || 6)} {featured.symbol}
            </div>
          </b>
        </div>
        <div>
          <span>{d.volume}</span>
          <b>{fmtUsd(ugnotToUsd(featured.volumeU || "0", gnotUsd))}</b>
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
