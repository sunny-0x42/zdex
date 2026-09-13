import { useEffect, useMemo, useState } from "react";
import { useDex } from "../context";
import { api } from "../lib/api";
import { fmtGnot, fmtInt, parseUgnot } from "../lib/format";
import type { ChainToken } from "../types";
import TokenAvatar from "./TokenAvatar";

export type TokenPick = {
  symbol: string;
  name?: string;
  key?: string;
  poolId?: string;
  pooled: boolean;
  internal?: boolean;
};

export default function TokenPicker({
  open,
  onClose,
  onSelect,
  includeGnot = true,
  allowUnpooled = true,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: TokenPick) => void;
  includeGnot?: boolean;
  allowUnpooled?: boolean;
}) {
  const { pools, wallet, walletAddr, d, netId, setTab } = useDex();
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState<ChainToken[]>([]);
  const [importRef, setImportRef] = useState("");
  const [importErr, setImportErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setImportErr("");
    let on = true;
    void api<{ tokens?: ChainToken[] }>(`/api/tokens?addr=${encodeURIComponent(walletAddr)}`, netId)
      .then((j) => {
        if (on) setCatalog(j.tokens || []);
      })
      .catch(() => {
        if (on) setCatalog([]);
      });
    return () => {
      on = false;
    };
  }, [open, netId, walletAddr]);

  const needle = q.trim().toLowerCase();
  const pooled = useMemo(() => {
    const rows: TokenPick[] = pools.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      key: p.key,
      poolId: p.id,
      pooled: true,
    }));
    return rows.filter((t) => matchTok(t, needle));
  }, [pools, needle]);

  const yours = useMemo(() => {
    const out: TokenPick[] = [];
    if (includeGnot) {
      out.push({ symbol: "GNOT", name: "Native", pooled: Boolean(pools.length), poolId: pools[0]?.id });
    }
    for (const t of catalog) {
      if (!t.symbol || t.symbol === "GNOT") continue;
      const bal = t.balance && t.balance !== "0";
      if (!bal && !wallet.balances?.[t.symbol]) continue;
      out.push({
        symbol: t.symbol,
        name: t.name,
        key: t.key,
        poolId: t.poolId,
        pooled: Boolean(t.pooled),
        internal: t.internal,
      });
    }
    return out.filter((t) => matchTok(t, needle));
  }, [catalog, includeGnot, pools, wallet.balances, needle]);

  const rest = useMemo(() => {
    if (!allowUnpooled) return [];
    const seen = new Set(pooled.map((t) => t.symbol.toUpperCase()));
    return catalog
      .filter((t) => t.symbol && !seen.has(t.symbol.toUpperCase()) && !t.pooled)
      .map((t) => ({
        symbol: t.symbol,
        name: t.name,
        key: t.key,
        pooled: false,
        internal: t.internal,
      }))
      .filter((t) => matchTok(t, needle));
  }, [allowUnpooled, catalog, pooled, needle]);

  async function doImport() {
    const ref = importRef.trim();
    if (!ref) return;
    setImportErr("");
    try {
      const j = await api<ChainToken & { found?: boolean }>(
        `/api/token?ref=${encodeURIComponent(ref)}&addr=${encodeURIComponent(walletAddr)}`,
        netId,
      );
      if (!j.symbol && !j.found) {
        setImportErr(d.tokenNotFound);
        return;
      }
      if (j.pooled) {
        onSelect({ symbol: j.symbol, name: j.name, key: j.key, poolId: j.poolId, pooled: true, internal: j.internal });
        onClose();
        return;
      }
      onSelect({ symbol: j.symbol, name: j.name, key: j.key, pooled: false, internal: j.internal });
      onClose();
    } catch {
      setImportErr(d.tokenNotFound);
    }
  }

  if (!open) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{d.selectToken}</h2>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={d.searchTokens}
        />
        <div className="token-list">
          {yours.length ? <p className="hint">{d.yourTokens}</p> : null}
          {yours.map((t) => (
            <TokRow key={"y-" + t.symbol} t={t} wallet={wallet} onClick={() => { onSelect(t); onClose(); }} />
          ))}
          {pooled.length ? <p className="hint">{d.pooled}</p> : null}
          {pooled.map((t) => (
            <TokRow key={"p-" + t.symbol} t={t} wallet={wallet} onClick={() => { onSelect(t); onClose(); }} />
          ))}
          {rest.length ? <p className="hint">{d.importToken}</p> : null}
          {rest.map((t) => (
            <TokRow
              key={"r-" + t.symbol}
              t={t}
              wallet={wallet}
              onClick={() => {
                onSelect(t);
                onClose();
              }}
            />
          ))}
        </div>
        {allowUnpooled ? (
          <>
            <div className="lookup-row">
              <input
                value={importRef}
                onChange={(e) => setImportRef(e.target.value)}
                placeholder={d.pasteHint}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void doImport();
                  }
                }}
              />
              <button className="btn sm" type="button" onClick={() => void doImport()}>
                {d.lookup}
              </button>
            </div>
            {importErr ? <p className="hint impact-hi">{importErr}</p> : null}
            <button className="btn ghost sm" type="button" onClick={() => { onClose(); setTab("create"); }}>
              {d.createPool}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function matchTok(t: TokenPick, needle: string): boolean {
  if (!needle) return true;
  return [t.symbol, t.name, t.key, t.poolId].some((x) => String(x || "").toLowerCase().includes(needle));
}

function TokRow({
  t,
  wallet,
  onClick,
}: {
  t: TokenPick;
  wallet: { coins?: string; balances?: Record<string, string> };
  onClick: () => void;
}) {
  const bal =
    t.symbol === "GNOT" ? fmtGnot(parseUgnot(wallet.coins || "0")) : wallet.balances?.[t.symbol] ? fmtInt(wallet.balances[t.symbol]) : "";
  return (
    <button type="button" onClick={onClick}>
      <TokenAvatar symbol={t.symbol} size={32} />
      <span>
        <b>{t.symbol}</b>
        <div className="muted">
          {t.name && t.name !== t.symbol ? t.name : t.pooled ? "Pool" : t.symbol === "GNOT" ? "Native" : ""}
          {bal ? ` · ${bal}` : ""}
        </div>
      </span>
    </button>
  );
}
