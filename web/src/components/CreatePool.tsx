import { useState } from "react";
import { useDex } from "../context";
import { toUgnot } from "../lib/format";

export default function CreatePool() {
  const { busy, runTx, call, setTab, d } = useDex();
  const [tokenKey, setTokenKey] = useState("");
  const [symbol, setSymbol] = useState("");
  const [gnot, setGnot] = useState("1");
  const [tokenAmt, setTokenAmt] = useState("1000000");
  const [feeBps, setFeeBps] = useState("30");

  const u = toUgnot(gnot);
  const key = tokenKey.trim() || symbol.trim();

  return (
    <section className="narrow">
      <div className="card">
        <p className="lede">{d.createHint}</p>
        <label>{d.symbol}</label>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="ZTT" />
        <label>{d.tokenKeyLbl}</label>
        <input value={tokenKey} onChange={(e) => setTokenKey(e.target.value)} placeholder={symbol ? `gno.land/r/… .${symbol}` : "registry key or blank if internal"} />
        <div className="pair">
          <div>
            <label>{d.gnotIn}</label>
            <input type="number" min="1" step="any" value={gnot} onChange={(e) => setGnot(e.target.value)} />
          </div>
          <div>
            <label>{d.tokenAmt}</label>
            <input type="number" min="1" value={tokenAmt} onChange={(e) => setTokenAmt(e.target.value)} />
          </div>
        </div>
        <label>{d.feeTier}</label>
        <select value={feeBps} onChange={(e) => setFeeBps(e.target.value)}>
          <option value="5">0.05% — stable / tight</option>
          <option value="30">0.30% — standard AMM</option>
          <option value="100">1.00% — volatile</option>
        </select>
        <p className="hint">
          {d.minList} · protocol {((Number(feeBps) * 1667) / 10000 / 100).toFixed(3)}% · LP {((Number(feeBps) * (10000 - 1667)) / 10000 / 100).toFixed(3)}%
        </p>
        <button
          className="btn primary wide"
          type="button"
          disabled={!!busy || !symbol.trim() || u < 1_000_000n}
          onClick={() =>
            void runTx("CreatePool", () =>
              call("CreatePool", [key, symbol.trim(), u.toString(), tokenAmt.trim(), feeBps], `${u.toString()}ugnot`),
            )
              .then(() => setTab("swap"))
              .catch(() => {})
          }
        >
          {busy || d.createPool}
        </button>
      </div>
    </section>
  );
}
