import { useDex } from "../context";

export default function BottomNav() {
  const { TABS, tab, setTab, d } = useDex();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((name) => (
        <button
          key={name}
          className={`nav-btn${tab === name || (name === "pools" && tab === "create") ? " on" : ""}`}
          type="button"
          aria-current={tab === name || (name === "pools" && tab === "create") ? "page" : undefined}
          onClick={() => setTab(name)}
        >
          {d.tab[name]}
        </button>
      ))}
    </nav>
  );
}
