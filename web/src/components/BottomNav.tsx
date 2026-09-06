import { useDex } from "../context";
import { MOBILE_TABS } from "../lib/hub";

export default function BottomNav() {
  const { TABS, tab, setTab, d } = useDex();
  const items = TABS.filter((name) => MOBILE_TABS.includes(name));
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((name) => (
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
