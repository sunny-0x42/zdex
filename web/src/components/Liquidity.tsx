import { useEffect, useMemo, useState } from "react";
import { useDex } from "../context";
import { lpFeeAprPct, mulDiv } from "../lib/amm";
import { api } from "../lib/api";
import { fmtGnot, fmtInt, toTokenBase, toUgnot, tokenPkgFromKey } from "../lib/format";
import { createPoolGates } from "../lib/createPoolGate";
import { isIncentivized } from "../lib/hub";
import type { ChainToken, Pool } from "../types";
import GaugePanel from "./GaugePanel";
import { PairAvatars, TokenChip } from "./TokenAvatar";

function poolStatus(p: Pool, height: number, d: { lpLocked: string; noLpSeed: string; canAdd: string }) {
  if (Number(p.totalLP) <= 0) return { ok: false, label: d.noLpSeed };
  if (p.launched && p.unlockH && height < Number(p.unlockH)) return { ok: false, label: d.lpLocked };
  return { ok: true, label: d.canAdd };
}

export default function Liquidity() {
  const { pools, pool, setPoolId, wallet, walletAddr, busy, runTx, call, d, live, netId, pkg, account, previewing } = useDex();
  const [catalog, setCatalog] = useState<ChainToken[]>([]);
  const [realmAddr, setRealmAddr] = useState("");
  const [pick, setPick] = useState(pool?.symbol || "");
  const [custom, setCustom] = useState("");
  const [resolved, setResolved] = useState<ChainToken | null>(null);
  const [lookupErr, setLookupErr] = useState("");
  const [gnot, setGnot] = useState("1");
  const [tokenAmt, setTokenAmt] = useState("");
  const [feeBps, setFeeBps] = useState("30");
  const [burn, setBurn] = useState("0");
  const [approved, setApproved] = useState(false);

  const height = Number(live.realmHeight || live.height || 0);
  const u = toUgnot(gnot);
  const existing = resolved ? pools.find((p) => p.symbol === resolved.symbol) || (pool?.symbol === resolved.symbol ? pool : null) : pool;
  const st = existing ? poolStatus(existing, height, d) : { ok: true, label: d.canAdd };
  const isNew = Boolean(resolved && !existing);
  const ru = BigInt(existing?.reserveU || 0);
  const rt = BigInt(existing?.reserveT || 0);
  const need = existing && ru > 0n ? mulDiv(u, rt, ru) : existing && ru === 0n ? mulDiv(u, rt, BigInt(existing.virtualU || "0") || 1n) : 0n;
  const mine = wallet.positions?.[existing?.id || ""] || "0";
  const maxToken = isNew ? tokenAmt.trim() : (need > 0n ? (need + need / 100n + 1n).toString() : tokenAmt.trim());

  useEffect(() => {
    let on = true;
    void api<{ tokens?: ChainToken[]; realmAddr?: string; registry?: string }>("/api/tokens", netId)
      .then((j) => {
        if (!on) return;
        setCatalog(j.tokens || []);
        if (j.realmAddr) setRealmAddr(j.realmAddr);
      })
      .catch(() => {
        /* pools fallback */
      });
    return () => {
      on = false;
    };
  }, [netId, pkg, live.ts]);

  const options = useMemo(() => {
    const by = new Map<string, ChainToken>();
    for (const p of pools) {
      by.set(p.symbol, { symbol: p.symbol, name: p.name, key: p.key || p.symbol, decimals: p.decimals || 0, pooled: true, internal: false });
    }
    for (const t of catalog) by.set(t.symbol, { ...by.get(t.symbol), ...t });
    return [...by.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [catalog, pools]);

  useEffect(() => {
    if (pick) return;
    if (pool?.symbol) setPick(pool.symbol);
  }, [pick, pool?.symbol]);

  useEffect(() => {
    if (!pick || pick === "__custom") return;
    const t = options.find((x) => x.symbol === pick);
    if (!t) return;
    setResolved(t);
    setLookupErr("");
    if (t.pooled) setPoolId(`ugnot|${t.symbol}`);
    setApproved(false);
  }, [pick, options, setPoolId]);

  async function lookupCustom() {
    const ref = custom.trim();
    if (!ref) return;
    setLookupErr("");
    try {
      const j = await api<ChainToken & { found?: boolean; error?: string }>(
        `/api/token?ref=${encodeURIComponent(ref)}&addr=${encodeURIComponent(walletAddr)}`,
        netId,
      );
      if (!j.found && !j.symbol) {
        setResolved(null);
        setLookupErr(d.tokenNotFound);
        return;
      }
      const tok: ChainToken = {
        symbol: j.symbol,
        name: j.name,
        key: j.key || ref,
        decimals: j.decimals || 0,
        pooled: Boolean(j.pooled),
        internal: Boolean(j.internal),
        balance: j.balance,
        poolId: j.poolId,
      };
      setApproved(false);
      setResolved(tok);
      setPick("__custom");
      if (tok.pooled) setPoolId(tok.poolId || `ugnot|${tok.symbol}`);
    } catch {
      setResolved(null);
      setLookupErr(d.tokenNotFound);
    }
  }

  async function approve() {
    if (!resolved || resolved.internal) return;
    const spender = realmAddr;
    const pkgPath = tokenPkgFromKey(resolved.key);
    const amt = isNew ? toTokenBase(tokenAmt, resolved.decimals || 0).toString() : maxToken;
    if (!spender || !pkgPath) throw new Error(d.approveNeedPkg);
    await runTx("Approve", () => call("Approve", [spender, amt || "0"], "", pkgPath));
    setApproved(true);
  }

  async function add() {
    if (!resolved) return;
    if (existing && st.ok) {
      await runTx("Add LP", () => call("AddLiquidity", [existing.id, u.toString(), maxToken || "1", "1"], `${u.toString()}ugnot`));
      return;
    }
    if (isNew) {
      const key = resolved.key || resolved.symbol;
      const tAmt = toTokenBase(tokenAmt, resolved.decimals || 0).toString();
      await runTx("CreatePool", () =>
        call("CreatePool", [key, resolved.symbol, u.toString(), tAmt, feeBps], `${u.toString()}ugnot`),
      );
    }
  }

  const hint = existing && need > 0n ? `${d.tokenMax} ≈ ${fmtInt(need)} ${existing.symbol}` : isNew ? d.newPair : d.lpHint;
  const canSign = Boolean(account && account.source === "adena" && !previewing);
  const tokPkg = resolved ? tokenPkgFromKey(resolved.key) : "";
  const newGates = createPoolGates({
    resolved,
    gnotUgnot: u,
    tokenBase: resolved ? toTokenBase(tokenAmt, resolved.decimals || 0) : 0n,
    canSign,
    tokPkg,
    realmAddr,
    approved,
  });
  const addDisabled = Boolean(
    busy ||
      !resolved ||
      u <= 0n ||
      (existing && !st.ok) ||
      (isNew && (!tokenAmt.trim() || u < 1_000_000n || !newGates.createReady)),
  );

  return (
    <section>
      <p className="lede">{d.noStakeHint}</p>
      <div className="grid">
        <div className="card">
          <div className="card-head">
            <h2>{d.addLiq}</h2>
          </div>
          <div className="swap-stack">
            <div className="swap-panel">
              <div className="swap-panel-top">
                <span>{d.gnotSide}</span>
                <span>{fmtGnot(wallet.coins)} GNOT</span>
              </div>
              <div className="swap-panel-row">
                <input className="swap-amt" type="number" min="0" step="any" value={gnot} onChange={(e) => setGnot(e.target.value)} />
                <TokenChip symbol="GNOT" />
              </div>
            </div>

            <div className="swap-panel">
              <div className="swap-panel-top">
                <span>{isNew ? d.tokenAmt : d.tokenMax}</span>
                <span>{resolved ? resolved.symbol : d.selectToken}</span>
              </div>
              <div className="swap-panel-row">
                <input
                  className="swap-amt"
                  type="number"
                  min="0"
                  value={isNew ? tokenAmt : need > 0n ? need.toString() : tokenAmt}
                  readOnly={!isNew && need > 0n}
                  onChange={(e) => setTokenAmt(e.target.value)}
                />
                {resolved ? <TokenChip symbol={resolved.symbol} /> : null}
              </div>
              <label>{d.selectToken}</label>
              <select
                value={pick}
                onChange={(e) => {
                  setPick(e.target.value);
                  if (e.target.value !== "__custom") setLookupErr("");
                }}
              >
                <option value="">{d.selectToken}</option>
                {options.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                    {t.name && t.name !== t.symbol ? ` — ${t.name}` : ""}
                    {t.pooled ? " · pool" : ""}
                  </option>
                ))}
                <option value="__custom">{d.customToken}</option>
              </select>
              {pick === "__custom" || !options.length ? (
                <div className="lookup-row">
                  <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder={d.pasteHint}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void lookupCustom();
                      }
                    }}
                  />
                  <button className="btn sm" type="button" onClick={() => void lookupCustom()}>
                    {d.lookup}
                  </button>
                </div>
              ) : null}
              {lookupErr ? <p className="hint impact-hi">{lookupErr}</p> : null}
              {resolved ? (
                <p className="hint">
                  {resolved.name} · {resolved.internal ? "internal" : resolved.key}
                </p>
              ) : null}
            </div>
          </div>

          {isNew ? (
            <>
              <label>{d.feeTier}</label>
              <select value={feeBps} onChange={(e) => setFeeBps(e.target.value)}>
                <option value="5">0.05%</option>
                <option value="30">0.30%</option>
                <option value="100">1.00%</option>
              </select>
            </>
          ) : null}

          <p className="hint">{resolved ? (isNew ? d.newPair : d.existingPair) : d.pasteHint}</p>
          <p className="hint">{hint}</p>
          {resolved && !resolved.internal ? (
            <button
              className="btn ghost wide"
              type="button"
              disabled={!!busy || (isNew ? !newGates.approveReady : !realmAddr || !tokPkg)}
              onClick={() => void approve().catch(() => {})}
            >
              {d.approveFirst}
            </button>
          ) : null}
          {isNew && resolved && !resolved.internal && !approved ? <p className="hint">{d.approveThenCreate}</p> : null}
          <button
            className="btn primary wide"
            type="button"
            disabled={addDisabled}
            onClick={() => void add().catch(() => {})}
          >
            {busy || (isNew ? d.createPool : d.addLiq)}
          </button>
          {existing && !st.ok ? <p className="hint">{st.label}</p> : null}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2>{d.removeLp}</h2>
            </div>
            <p className="stat">
              {d.yourLp} <b>{fmtInt(mine)}</b> {existing ? existing.symbol : ""}
            </p>
            <label>LP</label>
            <input type="number" value={burn} onChange={(e) => setBurn(e.target.value)} />
            <button
              className="btn ghost wide"
              type="button"
              disabled={!!busy || !existing}
              onClick={() => void runTx("Remove LP", () => call("RemoveLiquidity", [existing!.id, burn.trim(), "0", "0"])).catch(() => {})}
            >
              {d.removeLp}
            </button>
          </div>
          <GaugePanel pool={existing || pool} />
        </div>
      </div>

      {pools.length ? (
        <div className="mkt-grid" style={{ marginTop: 14 }}>
          {pools.map((row) => {
            const apr = lpFeeAprPct(row);
            const rowSt = poolStatus(row, height, d);
            const my = wallet.positions?.[row.id] || "0";
            const on = row.symbol === resolved?.symbol || row.id === existing?.id;
            return (
              <article
                key={row.id}
                className={`mkt-card${on ? " on" : ""}`}
                onClick={() => {
                  setPick(row.symbol);
                  setPoolId(row.id);
                }}
              >
                <div className="mkt-top">
                  <PairAvatars symbol={row.symbol || "?"} size={28} />
                  <div>
                    <b>{row.symbol}/GNOT</b>
                    <div className="muted">{row.name}</div>
                  </div>
                  {isIncentivized(live, row.id) ? <span className="pill live">{d.incentivized}</span> : null}
                </div>
                <div className="px">
                  {fmtGnot(row.reserveU)} <span className="muted">GNOT</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {row.feeBps / 100}% · {d.feeApr} {apr == null ? "—" : `${apr.toFixed(1)}%`}
                  {wallet.incentives?.[row.id] && wallet.incentives[row.id] !== "0"
                    ? ` · ${d.pendingReward} ${fmtGnot(wallet.incentives[row.id])}`
                    : ""}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {d.yourLp} {fmtInt(my)} · {rowSt.label}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
