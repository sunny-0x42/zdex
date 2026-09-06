import { useDex } from "../context";

export default function Footer() {
  const { setTab, d, gnoweb, live, net } = useDex();
  const faucet = live.faucet || net.faucet;
  return (
    <footer className="site-footer">
      <nav className="footer-links">
        <button className="link" type="button" onClick={() => setTab("guide")}>
          {d.tab.guide}
        </button>
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
      </nav>
      <p className="nfa">{d.nfaPearl}</p>
    </footer>
  );
}
