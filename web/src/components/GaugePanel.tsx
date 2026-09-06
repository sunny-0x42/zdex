import { useState } from "react";
import { useDex } from "../context";
import { fmtGnot, toUgnot } from "../lib/format";
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

  return (
    <div className="card">
      <div className="card-head">
        <h2>{d.fundGauge}</h2>
        {incentivized ? <span className="pill live">{d.incentivized}</span> : null}
      </div>
      <p className="hint">{d.gaugeHint}</p>
      {pool ? (
        <p className="stat">
          {pool.symbol}/GNOT
          {funded ? (
            <>
              {" · "}
              {d.gaugeFunded} <b>{fmtGnot(gauge!.totalFunded)} GNOT</b>
            </>
          ) : null}
        </p>
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
