import BottomNav from "./components/BottomNav";
import Featured from "./components/Featured";
import Header from "./components/Header";
import CreatePool from "./components/CreatePool";
import Liquidity from "./components/Liquidity";
import Markets from "./components/Markets";
import Orders from "./components/Orders";
import Portfolio from "./components/Portfolio";
import Stats from "./components/Stats";
import Swap from "./components/Swap";
import Ticker from "./components/Ticker";
import Toasts from "./components/Toasts";
import { useDex } from "./context";

const TITLES: Record<string, { title: string; sub: string }> = {
  swap: { title: "Trade", sub: "Swap GNOT and listed tokens at the pool price." },
  pools: { title: "Pools", sub: "Live markets, liquidity, and fee APR." },
  liq: { title: "Liquidity", sub: "Pick an on-chain token or paste its key, then add GNOT." },
  book: { title: "Orders", sub: "Escrow limit orders against the AMM." },
  create: { title: "Create pool", sub: "List an existing GRC20 against GNOT." },
  port: { title: "Portfolio", sub: "Balances, LP positions, and fee share." },
  stats: { title: "Overview", sub: "Protocol totals from the live realm." },
};

export default function App() {
  const { tab, setTab, live, liveState, d, pkg, resetPkg, net } = useDex();
  const head = TITLES[tab] || TITLES.swap;
  const pkgOff = pkg && pkg !== net.pkg;

  return (
    <>
      <Header />
      <Ticker />
      <div className="wrap">
        <div className="page-head">
          <div>
            <h1>{head.title}</h1>
            <p>{head.sub}</p>
          </div>
          {tab === "pools" ? (
            <button className="btn primary" type="button" onClick={() => setTab("create")}>
              {d.newPool}
            </button>
          ) : null}
          {tab === "create" ? (
            <button className="btn ghost" type="button" onClick={() => setTab("pools")}>
              {d.markets}
            </button>
          ) : null}
        </div>
        {pkgOff ? (
          <div className="notice">
            <span>
              {d.usingPkg} <span className="mono">{pkg}</span>
            </span>
            <button className="btn ghost sm" type="button" onClick={() => resetPkg()}>
              {d.useHubPkg}
            </button>
          </div>
        ) : null}
        {liveState === "connecting" && !live.pools?.length ? <div className="skeleton" /> : null}
        {tab === "swap" && live.pools?.length ? <Featured /> : null}
        {tab === "swap" ? <Swap /> : null}
        {tab === "pools" ? <Markets /> : null}
        {tab === "liq" ? <Liquidity /> : null}
        {tab === "book" ? <Orders /> : null}
        {tab === "create" ? <CreatePool /> : null}
        {tab === "port" ? <Portfolio /> : null}
        {tab === "stats" ? <Stats /> : null}
      </div>
      <BottomNav />
      <Toasts />
    </>
  );
}
