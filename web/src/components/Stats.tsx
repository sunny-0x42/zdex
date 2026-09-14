import { useEffect, useState } from "react";
import { useDex } from "../context";
import { feeTierLabel, gaugeFundedU, poolTvlU, poolVolumeU, splitOrders } from "../lib/analytics";
import { fmtApr, lpFeeAprPct } from "../lib/amm";
import { api } from "../lib/api";
import { fmtGnot, shortAddr } from "../lib/format";
import { fmtUsd, gnotUsdFromPools, poolTvlUsd, ugnotToUsd } from "../lib/usd";
import { isIncentivized } from "../lib/hub";
import Chart from "./Chart";
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
  feeU?: string;
  series?: Array<{ ts: number; tvlU: number; volumeU: number; feeU: number }>;
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
  const series = st?.series || [];
  const volSeries = series.map((x) => (Number(x.volumeU) || 0) / 1e6);
  const feeSeries = series.map((x) => (Number(x.feeU) || 0) / 1e6);
  const tvlSeries = series.map((x) => (Number(x.tvlU) || 0) / 1e6);
  const feeNow = st?.feeU || "0";
  const gnotUsd = gnotUsdFromPools(pools);
  const tvlUsd = ugnotToUsd(tvl, gnotUsd);
  const tvlUsdFull = tvlUsd != null ? tvlUsd * 2 : null;
  const volUsd = ugnotToUsd(vol, gnotUsd);
  const feeUsd = ugnotToUsd(feeNow, gnotUsd);
  const volSeriesUsd = gnotUsd != null ? volSeries.map((g) => g * gnotUsd) : volSeries;
  const feeSeriesUsd = gnotUsd != null ? feeSeries.map((g) => g * gnotUsd) : feeSeries;
  const tvlSeriesUsd = gnotUsd != null ? tvlSeries.map((g) => g * gnotUsd * 2) : tvlSeries;

  return (
    <section className="analytics">
      <p className="hint">{d.analyticsHint}</p>
      <p className="hint">
        {gnotUsd != null ? `GNOT ${fmtUsd(gnotUsd)}` : null} {d.usdPegHint}
      </p>
      <div className="kpis">
        <div>
          <span>{d.tvl}</span>
          <b>{fmtUsd(tvlUsdFull)}</b>
          <div className="muted">{fmtGnot(tvl)} GNOT</div>
        </div>
        <div>
          <span>{d.volume24h}</span>
          <b>{fmtUsd(volUsd)}</b>
          <div className="muted">{fmtGnot(vol)} GNOT</div>
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
          <b>{fmtUsd(ugnotToUsd(st?.epoch?.pot || "0", gnotUsd))}</b>
          <div className="muted">{fmtGnot(st?.epoch?.pot || "0")} GNOT</div>
        </div>
        <div>
          <span>{d.gaugeFunded}</span>
          <b>{fmtUsd(ugnotToUsd(funded, gnotUsd))}</b>
          <div className="muted">{fmtGnot(funded)} GNOT</div>
        </div>
      </div>

      <div className="chart-grid">
        <Chart title={`${d.chartVolume} $`} hint={d.volumeEstHint} values={volSeriesUsd} color="#4c82fb" />
        <Chart title={`${d.chartFees} $`} hint={d.chartFeesHint} values={feeSeriesUsd} color="#40b66b" />
        <Chart title={`${d.chartTvl} $`} values={tvlSeriesUsd} color="#7aa2ff" />
      </div>
      <p className="hint">
        {d.chartFees}: {fmtUsd(feeUsd)} · {fmtGnot(feeNow)} GNOT {d.est}
      </p>

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
                    <td className="r">
                      {fmtUsd(poolTvlUsd(p, gnotUsd))}
                      <div className="muted">{fmtGnot(p.reserveU)} GNOT</div>
                    </td>
                    <td className="r">
                      {fmtUsd(ugnotToUsd(p.volumeU || "0", gnotUsd))}
                      <div className="muted">{fmtGnot(p.volumeU || "0")}</div>
                    </td>
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
