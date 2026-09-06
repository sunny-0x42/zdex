import { useEffect, useState } from "react";
import { NETWORKS } from "../../config.js";
import { useDex } from "../context";
import { fmtGnot, parseUgnot, shortAddr } from "../lib/format";

export default function Header() {
  const { TABS, tab, setTab, netId, setNetId, live, liveState, lastTick, account, wallet, walletAddr, connect, connectWatchAddr, toast, d } =
    useDex();
  const [age, setAge] = useState(d.connecting);
  const [menu, setMenu] = useState(false);
  const [watch, setWatch] = useState("");

  useEffect(() => {
    const tick = () => {
      if (!lastTick) {
        setAge(d.connecting);
        return;
      }
      const s = Math.max(0, Math.round((Date.now() - lastTick) / 1000));
      setAge(s <= 2 ? d.live : d.ago(s));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastTick, d]);

  const stale = lastTick && Date.now() - lastTick > 12000;
  const dot = liveState === "on" && !stale ? "on" : liveState === "err" || stale ? "err" : "";
  const connected = account && account.source === "adena";

  return (
    <header className="top">
      <div className="brand">
        <div className="logo">z</div>
        <div className="brand-name">
          z<span>dex</span>
        </div>
      </div>
      <nav className="nav desktop-nav">
        {TABS.map((name) => (
          <button
            key={name}
            className={`nav-btn${tab === name || (name === "pools" && tab === "create") ? " on" : ""}`}
            type="button"
            onClick={() => setTab(name)}
          >
            {d.tab[name]}
          </button>
        ))}
      </nav>
      <div className="header-right">
        <select className="net-select" value={netId} onChange={(e) => setNetId(e.target.value)} title="Network">
          {Object.values(NETWORKS).map((n) => (
            <option key={n.id} value={n.id}>
              {n.chainName}
            </option>
          ))}
        </select>
        <div className="status-pill" title={age}>
          <span className={`dot ${dot}`} />
          <span className="mono">{live.realmHeight || live.height || "—"}</span>
        </div>
        {live.paused ? <span className="pill warn">Paused</span> : null}
        {live.faucet ? (
          <button className="btn ghost sm" type="button" onClick={() => window.open(live.faucet, "_blank", "noopener")}>
            {d.faucet}
          </button>
        ) : null}
        <div className="wallet-menu">
          <button className="btn wallet-btn" type="button" onClick={() => setMenu((v) => !v)}>
            {connected ? (
              <>
                <span className="wallet-addr">{shortAddr(account.address)}</span>
                <span className="wallet-bal">{fmtGnot(parseUgnot(wallet.coins))} GNOT</span>
              </>
            ) : walletAddr ? (
              <>
                <span className="wallet-addr">{shortAddr(walletAddr)}</span>
                <span className="wallet-bal">{fmtGnot(parseUgnot(wallet.coins))} GNOT</span>
              </>
            ) : (
              d.connect
            )}
          </button>
          {menu ? (
            <div className="menu">
              <button
                type="button"
                onClick={async () => {
                  setMenu(false);
                  try {
                    await connect();
                  } catch (e) {
                    toast(e instanceof Error ? e.message : String(e), "err");
                  }
                }}
              >
                Adena
              </button>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setMenu(false);
                  try {
                    await connectWatchAddr(watch);
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), "err");
                  }
                }}
              >
                <input value={watch} onChange={(e) => setWatch(e.target.value)} placeholder={d.watchAddr} />
                <button type="submit">{d.watch}</button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
