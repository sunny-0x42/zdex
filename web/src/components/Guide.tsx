import { useEffect } from "react";
import { useDex } from "../context";
import type { Tab } from "../types";

type Section = { id: string; title: string; body: string; tab?: Tab };

export default function Guide() {
  const { setTab, d, gnoweb, live, net } = useDex();
  const g = d.guide;
  const faucet = live.faucet || net.faucet;
  const sections: Section[] = [
    { id: "what", title: g.whatTitle, body: g.what },
    { id: "connect", title: g.connectTitle, body: g.connect },
    { id: "create", title: g.createTitle, body: g.create, tab: "create" },
    { id: "swap", title: g.swapTitle, body: g.swap, tab: "swap" },
    { id: "liquidity", title: g.liqTitle, body: g.liq, tab: "liq" },
    { id: "orders", title: g.ordersTitle, body: g.orders, tab: "book" },
    { id: "points", title: g.pointsTitle, body: g.points, tab: "port" },
    { id: "gauges", title: g.gaugesTitle, body: g.gauges, tab: "liq" },
    { id: "networks", title: g.networksTitle, body: g.networks, tab: "stats" },
    { id: "safety", title: g.safetyTitle, body: g.safety },
  ];

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <section className="guide">
      <div className="notice guide-banner" role="note">
        {g.banner}
      </div>
      <nav className="guide-toc" aria-label={g.onThisPage}>
        {sections.map((s) => (
          <a key={s.id} href={`#guide-${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
      {sections.map((s) => (
        <article key={s.id} id={`guide-${s.id}`} className="card guide-section">
          <h2>{s.title}</h2>
          <p>{s.body}</p>
          {s.tab ? (
            <button className="link" type="button" onClick={() => setTab(s.tab as Tab)}>
              {g.open} {d.tab[s.tab]}
            </button>
          ) : null}
        </article>
      ))}
      <div className="guide-foot">
        <div className="guide-links">
          <a href="https://github.com/sunny-0x42/zdex" target="_blank" rel="noopener noreferrer">
            {d.footerGithub}
          </a>
          <a href={gnoweb} target="_blank" rel="noopener noreferrer">
            {d.footerGnoweb}
          </a>
          {faucet ? (
            <a href={faucet} target="_blank" rel="noopener noreferrer">
              {d.faucet}
            </a>
          ) : null}
          <a href="https://adena.app/" target="_blank" rel="noopener noreferrer">
            {d.footerAdena}
          </a>
        </div>
        <p className="hint">{d.nfaPearl}</p>
      </div>
    </section>
  );
}
