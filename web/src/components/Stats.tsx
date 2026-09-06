import { useEffect, useState } from "react";
import { useDex } from "../context";
import { api } from "../lib/api";
import { fmtGnot, shortAddr } from "../lib/format";

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
  version?: string;
  epoch?: { id: string; pot: string };
};

export default function Stats() {
  const { netId, d, live, gnoweb } = useDex();
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

  const tvl = st?.tvlU || String((live.pools || []).reduce((s, p) => s + (Number(p.reserveU) || 0), 0));
  const vol = st?.volumeU || String((live.pools || []).reduce((s, p) => s + (Number(p.volumeU) || 0), 0));
  const pools = live.pools || [];

  return (
    <section>
      <div className="kpis">
        <div>
          <span>{d.tvl}</span>
          <b>{fmtGnot(tvl)} GNOT</b>
        </div>
        <div>
          <span>{d.volume}</span>
          <b>{fmtGnot(vol)} GNOT</b>
        </div>
        <div>
          <span>{d.poolCount}</span>
          <b>{st?.poolCount ?? pools.length}</b>
        </div>
        <div>
          <span>{d.blockHeight}</span>
          <b className="mono">{st?.height || live.height || "—"}</b>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
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
            <span>{d.epochPot}</span>
            <b>{fmtGnot(st?.epoch?.pot || "0")} GNOT</b>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          <a href={gnoweb} target="_blank" rel="noopener">
            Open on gnoweb
          </a>
        </p>
      </div>
    </section>
  );
}
