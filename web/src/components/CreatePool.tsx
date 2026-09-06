import { useEffect, useState } from "react";
import { useDex } from "../context";
import { api } from "../lib/api";
import { toTokenBase, toUgnot, tokenPkgFromKey } from "../lib/format";
import type { ChainToken } from "../types";

export default function CreatePool() {
  const { busy, runTx, call, setTab, addLp, d, netId, walletAddr, account, previewing, pkg } = useDex();
  const [tokenKey, setTokenKey] = useState("");
  const [resolved, setResolved] = useState<ChainToken | null>(null);
  const [lookupErr, setLookupErr] = useState("");
  const [gnot, setGnot] = useState("1");
  const [tokenAmt, setTokenAmt] = useState("1000");
  const [feeBps, setFeeBps] = useState("30");
  const [realmAddr, setRealmAddr] = useState("");
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    let on = true;
    void api<{ realmAddr?: string }>("/api/tokens", netId)
      .then((j) => {
        if (on && j.realmAddr) setRealmAddr(j.realmAddr);
      })
      .catch(() => {
        /* lookup still works */
      });
    return () => {
      on = false;
    };
  }, [netId, pkg]);

  const u = toUgnot(gnot);
  const decimals = resolved?.decimals || 0;
  const tokenBase = toTokenBase(tokenAmt, decimals);
  const tokPkg = resolved ? tokenPkgFromKey(resolved.key) : "";
  const canSign = Boolean(account && account.source === "adena" && !previewing);
  const ready = Boolean(
    resolved &&
      u >= 1_000_000n &&
      tokenBase > 0n &&
      canSign &&
      (resolved.internal || (tokPkg && realmAddr && approved)),
  );

  async function lookup() {
    const ref = tokenKey.trim();
    if (!ref) return;
    setLookupErr("");
    try {
      const j = await api<ChainToken & { found?: boolean; realmAddr?: string }>(
        `/api/token?ref=${encodeURIComponent(ref)}&addr=${encodeURIComponent(walletAddr)}`,
        netId,
      );
      if (!j.symbol && !j.found) {
        setResolved(null);
        setLookupErr(d.tokenNotFound);
        return;
      }
      if (j.pooled) {
        setResolved(null);
        setLookupErr(d.poolExists);
        return;
      }
      setApproved(false);
      setResolved({
        symbol: j.symbol,
        name: j.name || j.symbol,
        key: j.key || ref,
        decimals: j.decimals || 0,
        pooled: false,
        internal: Boolean(j.internal),
      });
      if (j.realmAddr) setRealmAddr(j.realmAddr);
    } catch {
      setResolved(null);
      setLookupErr(d.tokenNotFound);
    }
  }

  async function approve() {
    if (!resolved || resolved.internal) return;
    const spender = realmAddr;
    const pkgPath = tokPkg;
    if (!spender || !pkgPath) throw new Error(d.approveNeedPkg);
    await runTx("Approve", () => call("Approve", [spender, tokenBase.toString()], "", pkgPath));
    setApproved(true);
  }

  async function create() {
    if (!resolved) return;
    const key = resolved.key || tokenKey.trim();
    await runTx("CreatePool", () =>
      call("CreatePool", [key, resolved.symbol, u.toString(), tokenBase.toString(), feeBps], `${u.toString()}ugnot`),
    );
    addLp(`ugnot|${resolved.symbol}`);
  }

  return (
    <section className="narrow">
      <div className="card">
        <p className="lede">{d.createHint}</p>
        <label>{d.tokenKeyLbl}</label>
        <div className="lookup-row">
          <input
            value={tokenKey}
            onChange={(e) => setTokenKey(e.target.value)}
            placeholder={d.pasteHint}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void lookup();
              }
            }}
          />
          <button className="btn sm" type="button" onClick={() => void lookup()}>
            {d.lookup}
          </button>
        </div>
        {lookupErr ? <p className="hint impact-hi">{lookupErr}</p> : null}
        {resolved ? (
          <p className="hint">
            {resolved.symbol}
            {resolved.name && resolved.name !== resolved.symbol ? ` — ${resolved.name}` : ""} · {d.decimals} {decimals} ·{" "}
            <span className="mono">{resolved.key}</span>
          </p>
        ) : (
          <p className="hint">{d.createLookupFirst}</p>
        )}
        <div className="pair">
          <div>
            <label>{d.gnotIn}</label>
            <input type="number" min="1" step="any" value={gnot} onChange={(e) => setGnot(e.target.value)} />
          </div>
          <div>
            <label>
              {d.tokenAmt}
              {resolved ? ` (${resolved.symbol})` : ""}
            </label>
            <input type="number" min="0" step="any" value={tokenAmt} onChange={(e) => setTokenAmt(e.target.value)} />
          </div>
        </div>
        <label>{d.feeTier}</label>
        <select value={feeBps} onChange={(e) => setFeeBps(e.target.value)}>
          <option value="5">0.05% — stable / tight</option>
          <option value="30">0.30% — standard AMM</option>
          <option value="100">1.00% — volatile</option>
        </select>
        <p className="hint">
          {d.minList} · {d.createThenFund}
        </p>
        {!canSign ? <p className="hint">{d.connectToSign}</p> : null}
        {resolved && !resolved.internal && !approved ? <p className="hint">{d.approveThenCreate}</p> : null}
        {resolved && !resolved.internal ? (
          <button className="btn ghost wide" type="button" disabled={!!busy || !ready} onClick={() => void approve().catch(() => {})}>
            {d.approveFirst}
          </button>
        ) : null}
        <button className="btn primary wide" type="button" disabled={!!busy || !ready} onClick={() => void create().catch(() => {})}>
          {busy || d.createPool}
        </button>
        <button className="btn ghost wide" type="button" onClick={() => setTab("liq")}>
          {d.fundGauge} →
        </button>
      </div>
    </section>
  );
}
