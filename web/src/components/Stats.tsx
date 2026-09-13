import { useEffect, useState } from "react";
import { useDex } from "../context";
import { feeTierLabel, gaugeFundedU, poolTvlU, poolVolumeU, splitOrders } from "../lib/analytics";
import { fmtApr, lpFeeAprPct } from "../lib/amm";
import { api } from "../lib/api";
import { fmtGnot, shortAddr } from "../lib/format";
import { isIncentivized } from "../lib/hub";
import Spark from "./Spark";
import { PairAvatars } from "./TokenAvatar";

type StatsPayload = {
  ok: boolean;
  chainId?: string;
  chainName?: string;
  height?: string;
  realmHeight?: string;
  pkg?: string;
  admin?: string;
  paused?: boolean;
  poolCount?: number;
  orderCount?: number;
  tvlU?: string;
  volumeU?: string;
  virtualU?: string;
  version?: string;
  nextPkg?: string;
  latencyMs?: number;
  epoch?: { id: string; pot: string; pts?: string };
};

export default function Stats() {
  const { netId, d, live, gnoweb, setTab } = useDex();
  const [st, setSt] = useState<StatsPayload | null>(null);

  useEffect(() => {
    let on = true;
    const tick = async () => {
      try {
        const j = await api<StatsPayload>("/api/stats", netId);
        if (on) setSt(j);
      } catch {
        /* live fallback */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, [netId]);

  const pools = live.pools || [];
  const tvl = st?.tvlU || String(poolTvlU(pools));
  const vol = st?.volumeU || String(poolVolumeU(pools));
  const book = splitOrders(live.orders);
  const funded = gaugeFundedU(live.gauges);

  return (
    <section className="analytics">
      <p className="hint">{d.analyticsHint}</p>
      <div className="kpis">
        <div>
          <span>{d.tvl}</span>
          <b>{fmtGnot(tvl)} GNOT</b>
        </div>
        <div>
          <span>{d.volume24h}</span>
          <b>{fmtGnot(vol)} GNOT</b>
        </div>
        <div>
          <span>{d.poolCount}</span>
          <b>{st?.poolCount ?? pools.length}</b>
        </div>
        <div>
          <span>{d.openOrders}</span>
          <b>
            {st?.orderCount ?? live.orders?.length ?? 0}
            <span className="muted"> · {book.bids} {d.bids} / {book.asks} {d.asks}</span>
          </b>
        </div>
      </div>

      <div className="kpis" style={{ marginTop: 10 }}>
        <div>
          <span>{d.blockHeight}</span>
          <b className="mono">{st?.realmHeight || st?.height || live.realmHeight || live.height || "—"}</b>
        </div>
        <div>
          <span>{d.latency}</span>
          <b>{st?.latencyMs != null ? `${st.latencyMs} ms` : live.latencyMs != null ? `${live.latencyMs} ms` : "—"}</b>
        </div>
        <div>
          <span>{d.epochPot}</span>
          <b>{fmtGnot(st?.epoch?.pot || "0")} GNOT</b>
        </div>
        <div>
          <span>{d.gaugeFunded}</span>
          <b>{fmtGnot(funded)} GNOT</b>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <h2>{d.markets}</h2>
          <button className="btn ghost sm" type="button" onClick={() => setTab("pools")}>
            {d.markets} →
          </button>
        </div>
        {!pools.length ? (
          <p className="muted">{d.noMarkets}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{d.pair}</th>
                  <th className="r">{d.tvl}</th>
                  <th className="r">{d.volume24h}</th>
                  <th className="r">{d.fee}</th>
                  <th className="r">{d.feeApr}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pools.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="pair-cell">
                        <PairAvatars symbol={p.symbol} size={26} />
                        <button className="link" type="button" onClick={() => setTab("swap")}>
                          {p.symbol}/GNOT
                        </button>
                        {isIncentivized(live, p.id) ? <span className="pill live">{d.incentivized}</span> : null}
                      </div>
                    </td>
                    <td className="r">{fmtGnot(p.reserveU)} GNOT</td>
                    <td className="r">{fmtGnot(p.volumeU || "0")}</td>
                    <td className="r">{feeTierLabel(p.feeBps)}</td>
                    <td className="r">{fmtApr(lpFeeAprPct(p))}</td>
                    <td>
                      <Spark className="mini-spark" values={p.spark || []} w={88} h={28} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">{d.volumeEstHint}</p>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-head">
            <h2>{d.protocol}</h2>
            {live.version ? <span className="pill">v{st?.version || live.version}</span> : null}
          </div>
          <div className="stats">
            <div>
              <span>{d.network}</span>
              <b>
                {st?.chainName || live.chainName} · {st?.chainId || live.chainId}
              </b>
            </div>
            <div>
              <span>{d.admin}</span>
              <b className="mono">{shortAddr(st?.admin || live.admin)}</b>
            </div>
            <div>
              <span>{d.pausedLabel}</span>
              <b>{st?.paused || live.paused ? d.yes : d.no}</b>
            </div>
            <div>
              <span>{d.nextPkg}</span>
              <b className="mono">{st?.nextPkg || live.nextPkg || "—"}</b>
            </div>
          </div>
          <div className="sidecar-pills">
            <span className={`pill${live.incentivesV2Live ? " live" : ""}`}>incentives/v2 {live.incentivesV2Live ? "on" : "off"}</span>
            <span className={`pill${live.incentivesV3Live ? " live" : ""}`}>v3 {live.incentivesV3Live ? "on" : "off"}</span>
            <span className={`pill${live.incentivesV4Live ? " live" : ""}`}>v4 {live.incentivesV4Live ? "on" : "off"}</span>
            <span className={`pill${live.oracleLive || live.oraclePkg ? " live" : ""}`}>oracle {live.oracleLive || live.oraclePkg ? "pkg" : "off"}</span>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            <a href={gnoweb} target="_blank" rel="noopener">
              Open on gnoweb
            </a>
          </p>
        </div>
        <div className="card">
          <h2>{d.fundGauge}</h2>
          {!(live.gauges || []).length ? (
            <p className="muted">{d.noIncentivesPkg}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{d.pool}</th>
                    <th className="r">{d.gaugeFunded}</th>
                    <th className="r">{d.yourShare}</th>
                  </tr>
                </thead>
                <tbody>
                  {(live.gauges || []).map((g) => (
                    <tr key={g.pkg + g.id}>
                      <td className="mono">
                        {g.id}
                        <div className="muted">{g.pkg?.split("/").slice(-2).join("/")}</div>
                      </td>
                      <td className="r">{fmtGnot(g.totalFunded)} GNOT</td>
                      <td className="r">{g.on ? d.yes : d.no}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        {d.nfaPearl}
      </p>
    </section>
  );
}
