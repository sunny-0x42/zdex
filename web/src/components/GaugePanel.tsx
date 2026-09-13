import { useState } from "react";
import { useDex } from "../context";
import { fmtApr, gaugeBoostPct, lpFeeAprPct, rewardAprPct } from "../lib/amm";
import { fmtGnot, fmtInt, toUgnot } from "../lib/format";
import { gaugesFor, incentivesEnabled, isIncentivized, isLumpGauge, isTimedGauge } from "../lib/hub";
import type { Gauge, Pool } from "../types";
import TokenAvatar from "./TokenAvatar";

export default function GaugePanel({ pool }: { pool: Pool | null }) {
  const { net, live, wallet, account, previewing, busy, runTx, call, d } = useDex();
  const [amt, setAmt] = useState("1");
  const [days, setDays] = useState("7");
  if (!incentivesEnabled(net, live.caps)) return null;

  const rows = pool ? gaugesFor(live, pool.id) : [];
  const lump = rows.find(isLumpGauge);
  const timed = rows.find(isTimedGauge);
  const incentivized = pool ? isIncentivized(live, pool.id) : false;
  let claimN = 0n;
  try {
    claimN = BigInt(pool ? wallet.incentives?.[pool.id] || "0" : "0");
  } catch {
    claimN = 0n;
  }
  const u = toUgnot(amt);
  const canSign = Boolean(account && account.source === "adena" && !previewing);
  const fundOk = Boolean(pool && canSign && u >= 1_000_000n);
  const feeApr = pool ? lpFeeAprPct(pool) : null;
  const boost = pool && lump ? gaugeBoostPct(lump.totalFunded, pool.reserveU) : null;
  const rApr = pool && timed ? rewardAprPct(timed.rewardPerBlock, pool.reserveU) : null;
  const lp = pool ? wallet.positions?.[pool.id] || "0" : "0";
  const timedLive = Boolean(live.incentivesV4Live || live.incentivesV3Live);

  async function allPkgs(fn: "Claim" | "Sync") {
    const pkgs = rows.length ? rows.map((g) => g.pkg || "") : [lump?.pkg || timed?.pkg || ""];
    let last = await call(fn, [pool!.id], "", pkgs[0]);
    for (const pkg of pkgs.slice(1)) last = await call(fn, [pool!.id], "", pkg);
    return last;
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>{d.fundGauge}</h2>
        {incentivized ? <span className="pill live">{d.incentivized}</span> : null}
      </div>
      <p className="hint">{d.gaugeHint}</p>
      <p className="hint">{d.realtimeHint}</p>
      {pool ? (
        <div className="stats">
          <div>
            <span>{d.feeApr}</span>
            <b>{fmtApr(feeApr)}</b>
          </div>
          <div>
            <span>{d.pendingReward}</span>
            <b>{fmtGnot(claimN)} GNOT</b>
          </div>
          <div>
            <span>{d.yourShare}</span>
            <b>{fmtInt(lp)} LP</b>
          </div>
        </div>
      ) : null}
      {lump ? <GaugeRow title={d.lumpV1} g={lump} boost={boost} d={d} /> : null}
      {timed ? <GaugeRow title={d.timedProgram} g={timed} rApr={rApr} d={d} timed /> : null}
      {gaugePaused(rows) ? <p className="hint">{d.gaugePaused}</p> : null}
      {!pool ? <p className="hint">{d.pickPoolFirst}</p> : null}
      {!canSign ? <p className="hint">{d.connectToSign}</p> : null}
      <label>{d.fundAmt}</label>
      <input type="number" min="1" step="any" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <p className="hint">{d.minFund}</p>
      {timedLive ? (
        <>
          <label>{d.programDays}</label>
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">{d.day1}</option>
            <option value="7">{d.day7}</option>
          </select>
          <button
            className="btn primary wide"
            type="button"
            disabled={!!busy || !fundOk}
            onClick={() =>
              void runTx("FundProgram", () =>
                call("FundProgram", [pool!.id, days === "1" ? "28800" : "201600"], `${u.toString()}ugnot`),
              ).catch(() => {})
            }
          >
            {busy || d.fundProgram}
          </button>
        </>
      ) : (
        <button
          className="btn primary wide"
          type="button"
          disabled={!!busy || !fundOk}
          onClick={() => void runTx("Fund", () => call("Fund", [pool!.id], `${u.toString()}ugnot`)).catch(() => {})}
        >
          {busy || d.fundGauge}
        </button>
      )}
      {claimN > 0n ? (
        <button className="btn ghost wide" type="button" disabled={!!busy || !pool || !canSign} onClick={() => void runTx("Claim", () => allPkgs("Claim")).catch(() => {})}>
          {d.claimIncentive} · {fmtGnot(claimN)} GNOT
        </button>
      ) : null}
      <button className="btn ghost wide" type="button" disabled={!!busy || !pool || !canSign} onClick={() => void runTx("Sync", () => allPkgs("Sync")).catch(() => {})}>
        {d.syncAllPkgs}
      </button>
    </div>
  );
}

function gaugePaused(rows: Gauge[]): boolean {
  return rows.some((g) => g.paused);
}

function GaugeRow({
  title,
  g,
  boost,
  rApr,
  d,
  timed,
}: {
  title: string;
  g: Gauge;
  boost?: number | null;
  rApr?: number | null;
  timed?: boolean;
  d: {
    boostTvl: string;
    rewardApr: string;
    gaugeFunded: string;
    remaining: string;
    endsAtHeight: string;
  };
}) {
  return (
    <div className="stats" style={{ marginTop: 8 }}>
      <div>
        <span>{title}</span>
        <b className="amt-chip">
          <TokenAvatar symbol="GNOT" size={16} />
          {fmtGnot(g.totalFunded)} GNOT
        </b>
      </div>
      {!timed && boost != null ? (
        <div>
          <span>{d.boostTvl}</span>
          <b>{fmtApr(boost)}</b>
        </div>
      ) : null}
      {timed && rApr != null ? (
        <div>
          <span>{d.rewardApr}</span>
          <b>{fmtApr(rApr)}</b>
        </div>
      ) : null}
      {timed && g.remaining ? (
        <div>
          <span>{d.remaining}</span>
          <b>{fmtGnot(g.remaining)} GNOT</b>
        </div>
      ) : null}
      {timed && g.endH ? (
        <div>
          <span>{d.endsAtHeight}</span>
          <b className="mono">{g.endH}</b>
        </div>
      ) : null}
    </div>
  );
}
