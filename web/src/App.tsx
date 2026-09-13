import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Guide from "./components/Guide";
import Liquidity from "./components/Liquidity";
import Markets from "./components/Markets";
import Orders from "./components/Orders";
import Portfolio from "./components/Portfolio";
import Stats from "./components/Stats";
import Swap from "./components/Swap";
import Toasts from "./components/Toasts";
import { useDex } from "./context";

export default function App() {
  const { tab, setTab, live, liveState, d, pkg, resetPkg, net } = useDex();
  const title = d.tab[tab] || d.tab.swap;
  const sub = d.pageSub[tab] || d.pageSub.swap;
  const pkgOff = pkg && pkg !== net.pkg;
  const swapMode = tab === "swap";

  return (
    <>
      <a className="skip-link" href="#main">
        {d.skipToMain}
      </a>
      <Header />
      <div className={`wrap fade-up${swapMode ? " swap-mode" : ""}`} id="main" key={tab}>
        {!swapMode ? (
          <div className="page-head">
            <div>
              <h1>{title}</h1>
              <p>{sub}</p>
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
        ) : null}
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
        {tab === "swap" ? <Swap /> : null}
        {tab === "pools" ? <Markets /> : null}
        {tab === "liq" || tab === "create" ? <Liquidity listing={tab === "create"} /> : null}
        {tab === "book" ? <Orders /> : null}
        {tab === "port" ? <Portfolio /> : null}
        {tab === "stats" ? <Stats /> : null}
        {tab === "guide" ? <Guide /> : null}
      </div>
      <Footer />
      <BottomNav />
      <Toasts />
    </>
  );
}
