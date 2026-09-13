import { useEffect, useMemo, useState } from "react";
import { useDex } from "../context";
import { errText } from "../i18n";
import { mulDiv, quoteInLocal, quoteLocal } from "../lib/amm";
import { api } from "../lib/api";
import { UGNOT, fmtGnot, fmtInt, parseUgnot, toUgnot } from "../lib/format";
import TokenAvatar from "./TokenAvatar";
import TokenPicker from "./TokenPicker";

type Preflight = {
  ok: boolean;
  amountOut: string;
  warnings: string[];
  errors: string[];
};

type PickSide = "in" | "out" | null;

export default function Swap() {
  const { live, pool, pools, setPoolId, setTab, wallet, walletAddr, busy, runTx, call, deadline, toast, d, netId } = useDex();
  const [tokenIn, setTokenIn] = useState("ugnot");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [slippage, setSlippage] = useState("100");
  const [exactOut, setExactOut] = useState(false);
  const [chainOut, setChainOut] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Preflight | null>(null);
  const [settings, setSettings] = useState(false);
  const [details, setDetails] = useState(false);
  const [pick, setPick] = useState<PickSide>(null);

  const outSym = tokenIn === "ugnot" ? pool?.symbol || "token" : "GNOT";
  const inSym = tokenIn === "ugnot" ? "GNOT" : pool?.symbol || "token";
  const exactOk = !!live.caps?.exactOut;

  const quote = useMemo(() => {
    if (!pool) return null;
    const slip = BigInt(slippage || 100);
    const feeTxt = `${pool.feeBps / 100}%`;
    const spot = `1 GNOT = ${fmtInt(pool.quote1gnot)} ${pool.symbol}`;
    const bal = tokenIn === "ugnot" ? parseUgnot(wallet.coins) : BigInt(wallet.balances?.[pool.symbol] || 0);
    if (exactOut && exactOk) {
      const raw = String(amountOut || "0").replace(/,/g, "");
      const want = tokenIn === "ugnot" ? BigInt(Math.max(0, Number(raw) || 0)) : toUgnot(raw);
      const tokenOut = tokenIn === "ugnot" ? pool.symbol : "ugnot";
      const inn = quoteInLocal(pool, tokenOut, want);
      const maxIn = inn + mulDiv(inn, slip, 10000n);
      return {
        inn,
        out: want,
        slipHint: tokenIn === "ugnot" ? fmtGnot(maxIn) + " GNOT max" : fmtInt(maxIn) + " max",
        impact: "exact out",
        impactCls: "",
        feeTxt,
        spot,
        bal,
        inDisplay: tokenIn === "ugnot" ? fmtGnot(inn).replace(/,/g, "") : inn.toString(),
        outDisplay: amountOut,
        min: 0n,
        source: "local" as const,
      };
    }
    const inn = tokenIn === "ugnot" ? toUgnot(amountIn) : BigInt(Math.max(0, Number(amountIn) || 0));
    if (inn <= 0n) {
      return { inn: 0n, out: 0n, slipHint: "—", impact: "—", impactCls: "", feeTxt, spot, bal, inDisplay: amountIn, outDisplay: "", min: 0n, source: "local" as const };
    }
    const localOut = quoteLocal(pool, tokenIn, inn);
    const used = chainOut != null ? BigInt(chainOut) : localOut;
    const min = used - mulDiv(used, slip, 10000n);
    const mid = quoteLocal(pool, tokenIn, tokenIn === "ugnot" ? UGNOT : 1n);
    const avg = Number(used) / Number(inn);
    const midPx = Number(mid) / Number(tokenIn === "ugnot" ? UGNOT : 1n);
    const impact = midPx > 0 ? (1 - avg / midPx) * 100 : 0;
    return {
      inn,
      out: used,
      localOut,
      slipHint: tokenIn === "ugnot" ? fmtInt(min) : fmtGnot(min),
      impact: `${impact.toFixed(2)}%`,
      impactCls: impact > 5 ? "impact-hi" : impact > 1 ? "impact-mid" : "impact-lo",
      feeTxt,
      spot,
      bal,
      inDisplay: amountIn,
      outDisplay: tokenIn === "ugnot" ? fmtInt(used) : fmtGnot(used),
      min,
      source: chainOut != null ? ("chain" as const) : ("local" as const),
    };
  }, [pool, tokenIn, amountIn, amountOut, slippage, exactOut, exactOk, wallet, chainOut]);

  useEffect(() => {
    if (!pool || exactOut || !quote?.inn) {
      setChainOut(null);
      return;
    }
    const inn = quote.inn.toString();
    const t = setTimeout(() => {
      void api<{ amountOut: string }>(
        `/api/quote?pool=${encodeURIComponent(pool.id)}&tokenIn=${encodeURIComponent(tokenIn)}&amountIn=${inn}`,
        netId,
      )
        .then((j) => setChainOut(String(j.amountOut)))
        .catch(() => setChainOut(null));
    }, 180);
    return () => clearTimeout(t);
  }, [pool, tokenIn, amountIn, exactOut, quote?.inn, netId]);

  const h = Number(live.realmHeight || 0);
  const bits: string[] = [];
  if (pool?.snipeUntil && h < Number(pool.snipeUntil)) {
    bits.push(`Anti-snipe ${Number(pool.snipeMaxBps) / 100}% · ${Number(pool.snipeUntil) - h} blocks`);
  }
  if (pool?.unlockH && h < Number(pool.unlockH)) bits.push(`LP locked ${Number(pool.unlockH) - h} blocks`);

  const diverge =
    quote && quote.localOut != null && chainOut != null && quote.localOut > 0n
      ? Number(quote.out - quote.localOut) / Number(quote.localOut)
      : 0;

  function chooseToken(symbol: string, poolId?: string) {
    if (poolId) setPoolId(poolId);
    if (pick === "in") {
      setTokenIn(symbol === "GNOT" ? "ugnot" : symbol);
    } else if (pick === "out") {
      setTokenIn(symbol === "GNOT" ? (pool?.symbol || "ugnot") : "ugnot");
      if (symbol !== "GNOT" && poolId) setPoolId(poolId);
    }
    setPick(null);
  }

  async function openConfirm() {
    if (!pool || !quote) return toast(d.noPool, "err");
    try {
      const pf = await api<Preflight>(
        `/api/preflight?pool=${encodeURIComponent(pool.id)}&tokenIn=${encodeURIComponent(tokenIn)}&amountIn=${quote.inn.toString()}&minOut=${(quote.min || 0n).toString()}&addr=${encodeURIComponent(walletAddr)}`,
        netId,
      );
      setConfirm(pf);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "err");
    }
  }

  async function doSwap() {
    if (!pool || !quote) return;
    setConfirm(null);
    try {
      await runTx("SwapExactIn", async () => {
        if (quote.inn <= 0n) throw new Error("amountIn = 0");
        return call(
          "SwapExactIn",
          [pool.id, tokenIn, quote.inn.toString(), (quote.min || 0n).toString(), deadline],
          tokenIn === "ugnot" ? `${quote.inn.toString()}ugnot` : "",
        );
      });
    } catch {
      /* toasted */
    }
  }

  if (!pools.length) {
    return (
      <div className="card empty-card">
        <h2>{d.noPoolsYet}</h2>
        <p className="muted">{d.emptyPoolsBody}</p>
        <div className="empty-actions">
          <button className="btn primary" type="button" onClick={() => setTab("create")}>
            {d.createPool}
          </button>
          <button className="btn ghost" type="button" onClick={() => setTab("guide")}>
            {d.readGuide}
          </button>
        </div>
      </div>
    );
  }

  const cta = !walletAddr ? d.connect : busy || d.swap;

  return (
    <section className="swap-shell">
      <div className="card swap-card uniswap">
        <div className="swap-toolbar">
          <h2>{d.swap}</h2>
          <button className="icon-btn" type="button" aria-label={d.settings} onClick={() => setSettings((v) => !v)}>
            ⚙
          </button>
        </div>
        {settings ? (
          <div className="swap-settings">
            <span>{d.slippage}</span>
            {(["50", "100", "200"] as const).map((v) => (
              <button key={v} className={`chip${slippage === v ? " on" : ""}`} type="button" onClick={() => setSlippage(v)}>
                {Number(v) / 100}%
              </button>
            ))}
            {exactOk ? (
              <label className="slip">
                <input type="checkbox" checked={exactOut} onChange={(e) => setExactOut(e.target.checked)} /> {d.exactOut}
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="swap-stack">
          <div className="swap-panel">
            <div className="swap-panel-top">
              <span>{d.sell}</span>
              <button
                className="link"
                type="button"
                onClick={() => {
                  if (!quote) return;
                  setAmountIn(tokenIn === "ugnot" ? fmtGnot(quote.bal).replace(/,/g, "") : quote.bal.toString());
                  setExactOut(false);
                }}
              >
                {d.max}
              </button>
            </div>
            <div className="swap-panel-row">
              <input
                className="swap-amt"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={exactOut && exactOk ? quote?.inDisplay || "" : amountIn}
                readOnly={exactOut && exactOk}
                onChange={(e) => setAmountIn(e.target.value)}
              />
              <button className="token-pill" type="button" onClick={() => setPick("in")}>
                <TokenAvatar symbol={inSym} size={24} />
                {inSym}
                <span className="caret">▾</span>
              </button>
            </div>
            <div className="swap-bal">
              {d.balance} {tokenIn === "ugnot" ? fmtGnot(quote?.bal || 0n) : fmtInt(quote?.bal || 0n)} {inSym}
            </div>
          </div>

          <button
            className="flip-mid"
            type="button"
            aria-label="flip"
            onClick={() => pool && setTokenIn(tokenIn === "ugnot" ? pool.symbol : "ugnot")}
          >
            ↓
          </button>

          <div className="swap-panel">
            <div className="swap-panel-top">
              <span>{d.buy}</span>
            </div>
            <div className="swap-panel-row">
              <input
                className="swap-amt"
                type="text"
                placeholder="0"
                value={exactOut && exactOk ? amountOut : quote?.outDisplay || ""}
                readOnly={!(exactOut && exactOk)}
                onChange={(e) => setAmountOut(e.target.value)}
              />
              <button className="token-pill" type="button" onClick={() => setPick("out")}>
                <TokenAvatar symbol={outSym} size={24} />
                {outSym}
                <span className="caret">▾</span>
              </button>
            </div>
          </div>
        </div>

        <button
          className="btn primary swap-cta"
          type="button"
          disabled={!!busy || !pool || (Boolean(walletAddr) && !(quote && quote.inn > 0n))}
          onClick={() => void openConfirm()}
        >
          {cta}
        </button>

        <button className="details-toggle" type="button" onClick={() => setDetails((v) => !v)}>
          <span>{quote?.spot || d.price}</span>
          <span>{details ? "▴" : "▾"}</span>
        </button>
        {details ? (
          <div className="quote">
            <div>
              <span>{d.impact}</span>
              <b className={quote?.impactCls}>{quote?.impact || "—"}</b>
            </div>
            <div>
              <span>{d.minOut}</span>
              <b className="mono">{quote?.slipHint || "—"}</b>
            </div>
            <div>
              <span>{d.fee}</span>
              <b>{quote?.feeTxt || "—"}</b>
            </div>
            <div>
              <span>{d.slippage}</span>
              <b>{Number(slippage) / 100}%</b>
            </div>
            {pool ? (
              <div>
                <span>TVL</span>
                <b>{fmtGnot(pool.reserveU)} GNOT</b>
              </div>
            ) : null}
          </div>
        ) : null}
        {Math.abs(diverge) > 0.01 ? <p className="hint">{d.diverge}</p> : null}
        {bits.length ? <p className="hint">{bits.join(" · ")}</p> : null}
      </div>

      <TokenPicker
        open={Boolean(pick)}
        includeGnot
        allowUnpooled
        onClose={() => setPick(null)}
        onSelect={(t) => {
          if (t.symbol === "GNOT") {
            chooseToken("GNOT", t.poolId || pool?.id);
            return;
          }
          if (!t.pooled) {
            setPick(null);
            setTab("create");
            return;
          }
          chooseToken(t.symbol, t.poolId);
        }}
      />

      {confirm ? (
        <div className="modal" onClick={() => setConfirm(null)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{d.confirmSwap}</h2>
            <p className="hint">
              {d.sell} {tokenIn === "ugnot" ? fmtGnot(quote?.inn || 0n) : fmtInt(quote?.inn || 0n)} {inSym}
            </p>
            <p className="hint">
              {d.buy} {tokenIn === "ugnot" ? fmtInt(confirm.amountOut) : fmtGnot(confirm.amountOut)} {outSym}
            </p>
            {(confirm.errors || []).map((c) => (
              <p key={c} className="hint impact-hi">
                {errText(d, c)}
              </p>
            ))}
            {(confirm.warnings || []).map((c) => (
              <p key={c} className="hint">
                {errText(d, c)}
              </p>
            ))}
            <div className="pair">
              <button className="btn ghost wide" type="button" onClick={() => setConfirm(null)}>
                {d.cancel}
              </button>
              <button className="btn primary wide" type="button" disabled={!confirm.ok || !!busy} onClick={() => void doSwap()}>
                {d.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
