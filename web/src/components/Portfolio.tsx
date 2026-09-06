import { useDex } from "../context";
import { fmtGnot, fmtInt, parseUgnot } from "../lib/format";

export default function Portfolio() {
  const { walletAddr, previewing, wallet, pools, pool, busy, runTx, call, d, live } = useDex();
  const showPoints = live.caps?.points !== false || live.caps?.feeShare !== false;
  if (!walletAddr) {
    return <div className="empty">{d.noWallet}</div>;
  }
  const vests = [];
  for (const p of pools) {
    const raw = wallet.vests?.[p.symbol] || "";
    if (!raw || raw === "0 0 0") continue;
    const nums = String(raw).match(/-?\d+/g) || [];
    vests.push({ symbol: p.symbol, total: nums[0] || "0", claimed: nums[1] || "0", rel: nums[2] || "0" });
  }
  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h2>{d.bals}</h2>
        </div>
        <p className="addr">{previewing ? `${d.localView} · ${walletAddr}` : walletAddr}</p>
        <div className="stats">
          <div>
            <span>GNOT</span>
            <b>{fmtGnot(parseUgnot(wallet.coins))}</b>
          </div>
          {pools.map((p) => (
            <div key={p.id}>
              <span>{p.symbol}</span>
              <b>{fmtInt(wallet.balances?.[p.symbol] || 0)}</b>
              <span>LP</span>
              <b>{fmtInt(wallet.positions?.[p.id] || 0)}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        {showPoints ? (
          <>
            <div className="card-head">
              <h2>{d.rewards}</h2>
            </div>
            <p className="hint">{d.pointsHint}</p>
            <div className="stats">
              <div>
                <span>{d.pointsLife}</span>
                <b>{fmtInt(wallet.points?.life || "0")}</b>
              </div>
              <div>
                <span>{d.pointsEpoch}</span>
                <b>{fmtInt(wallet.points?.epoch || "0")}</b>
              </div>
              <div>
                <span>{d.pointsClaim}</span>
                <b>{fmtGnot(wallet.points?.claimable || "0")} GNOT</b>
              </div>
            </div>
            <button
              className="btn primary wide"
              type="button"
              disabled={!!busy || BigInt(wallet.points?.claimable || "0") <= 0n}
              onClick={() => void runTx("ClaimFeeShare", () => call("ClaimFeeShare", [])).catch(() => {})}
            >
              {d.pointsClaim}
            </button>
            <button
              className="btn ghost wide"
              type="button"
              disabled={!!busy || !pool}
              onClick={() => void runTx("HarvestPoints", () => call("HarvestPoints", [pool!.id])).catch(() => {})}
            >
              {d.pointsHarvest}
            </button>
          </>
        ) : null}
        {vests.length ? (
          <>
            <h2 style={{ marginTop: 16 }}>{d.vesting}</h2>
            {vests.map((v) => (
              <div className="token-box" key={v.symbol}>
                <div>
                  {v.symbol} · {fmtInt(v.total)} / {fmtInt(v.claimed)} / {fmtInt(v.rel)}
                </div>
                <button className="btn sm" type="button" disabled={!!busy} onClick={() => void runTx(`Claim ${v.symbol}`, () => call("ClaimVest", [v.symbol])).catch(() => {})}>
                  {d.claim}
                </button>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}
