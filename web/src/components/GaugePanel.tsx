import { useState } from "react";
import { useDex } from "../context";
import { fmtApr, gaugeBoostPct, lpFeeAprPct, rewardAprPct } from "../lib/amm";
import { fmtGnot, fmtInt, toUgnot } from "../lib/format";
import { gaugeFor, incentivesEnabled, isIncentivized } from "../lib/hub";
import type { Pool } from "../types";

export default function GaugePanel({ pool }: { pool: Pool | null }) {
  const { net, live, wallet, account, previewing, busy, runTx, call, d } = useDex();
  const [amt, setAmt] = useState("1");
  if (!incentivesEnabled(net, live.caps)) return null;

  const gauge = pool ? gaugeFor(live, pool.id) : undefined;
  const incentivized = pool ? isIncentivized(live, pool.id) : false;
  let claimN = 0n;
  try {
    claimN = BigInt(pool ? wallet.incentives?.[pool.id] || "0" : "0");
  } catch {
    claimN = 0n;
  }
  const u = toUgnot(amt);
  const canSign = Boolean(account && account.source === "adena" && !previewing);
  const funded = Boolean(gauge?.totalFunded && gauge.totalFunded !== "0");
  const fundOk = Boolean(pool && canSign && u >= 1_000_000n);
  const feeApr = pool ? lpFeeAprPct(pool) : null;
  const boost = pool && gauge ? gaugeBoostPct(gauge.totalFunded, pool.reserveU) : null;
  const rApr = pool && gauge ? rewardAprPct(gauge.rewardPerBlock, pool.reserveU) : null;
  const lp = pool ? wallet.positions?.[pool.id] || "0" : "0";

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
          {funded ? (
            <div>
              <span>{d.boostTvl}</span>
              <b>{fmtApr(boost)}</b>
            </div>
          ) : null}
          {rApr != null ? (
            <div>
              <span>{d.rewardApr}</span>
              <b>{fmtApr(rApr)}</b>
            </div>
          ) : null}
          {funded ? (
            <div>
              <span>{d.gaugeFunded}</span>
              <b>{fmtGnot(gauge!.totalFunded)} GNOT</b>
            </div>
          ) : null}
        </div>
      ) : null}
      {gauge?.paused ? <p className="hint">{d.gaugePaused}</p> : null}
      {!pool ? <p className="hint">{d.pickPoolFirst}</p> : null}
      {!canSign ? <p className="hint">{d.connectToSign}</p> : null}
      <label>{d.fundAmt}</label>
      <input type="number" min="1" step="any" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <p className="hint">{d.minFund}</p>
      <button
        className="btn primary wide"
        type="button"
        disabled={!!busy || !fundOk}
        onClick={() => void runTx("Fund", () => call("Fund", [pool!.id], `${u.toString()}ugnot`)).catch(() => {})}
      >
        {busy || d.fundGauge}
      </button>
      {claimN > 0n ? (
        <button
          className="btn ghost wide"
          type="button"
          disabled={!!busy || !pool || !canSign}
          onClick={() => void runTx("Claim", () => call("Claim", [pool!.id])).catch(() => {})}
        >
          {d.claimIncentive} · {fmtGnot(claimN)} GNOT
        </button>
      ) : (
        <button
          className="btn ghost wide"
          type="button"
          disabled={!!busy || !pool || !canSign}
          onClick={() => void runTx("Sync", () => call("Sync", [pool!.id])).catch(() => {})}
        >
          {d.syncGauge}
        </button>
      )}
    </div>
  );
}
