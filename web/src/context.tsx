import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_NET, NETWORKS, PKG_PATH } from "../config.js";
import { copy, type Dict } from "./i18n";
import { api, mergeSparks, sleep } from "./lib/api";
import { ALL_TABS, FUNC_SURFACE, readPkgOverride, tabsFor, writePkgOverride } from "./lib/hub";
import { connectAdena, connectWatch, doContractCall, hasAdena, resolvePkgPath } from "./lib/wallets";
import type { Account, Live, LiveState, Network, Pool, Tab, Toast, TxResult, Wallet } from "./types";

const NETS = NETWORKS as Record<string, Network>;

const NET_KEY = "zdex.net";

type DexValue = {
  TABS: Tab[];
  followPkg: (path: string) => void;
  resetPkg: () => void;
  d: Dict;
  netId: string;
  net: Network;
  setNetId: (id: string) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  poolId: string;
  setPoolId: (id: string) => void;
  tradePool: (id: string) => void;
  addLp: (id: string) => void;
  live: Live;
  liveState: LiveState;
  lastTick: number;
  pools: Pool[];
  pool: Pool | null;
  featured: Pool | null;
  pkg: string;
  gnoweb: string;
  account: Account | null;
  wallet: Wallet;
  walletAddr: string;
  previewing: boolean;
  busy: string;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  toast: (msg: string, kind?: Toast["kind"], hash?: string) => void;
  connect: () => Promise<void>;
  connectWatchAddr: (addr: string) => Promise<void>;
  call: (func: string, args: string[], send?: string, pkgPath?: string) => Promise<TxResult>;
  runTx: (label: string, fn: () => Promise<TxResult>) => Promise<TxResult>;
  waitTx: (hash: string) => Promise<TxResult | null>;
  refreshWallet: () => Promise<void>;
  refreshLive: () => Promise<void>;
  deadline: string;
};

const Dex = createContext<DexValue | null>(null);

function readUrl() {
  const q = new URLSearchParams(window.location.search);
  const net = NETS[q.get("net") || ""] ? q.get("net") : null;
  const rawTab = q.get("tab") === "launch" ? "create" : q.get("tab");
  const tab = ALL_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "swap";
  const pool = q.get("pool") || "";
  return { net, tab, pool };
}

function readSavedNet(): string {
  try {
    const s = localStorage.getItem(NET_KEY);
    if (s && NETS[s]) return s;
  } catch {
    /* ignore */
  }
  return DEFAULT_NET;
}

export function DexProvider({ children }: { children: ReactNode }) {
  const init = readUrl();
  const [netId, setNetIdState] = useState(init.net || readSavedNet());
  const [tab, setTabState] = useState<Tab>(init.tab);
  const [poolId, setPoolIdState] = useState(init.pool);
  const [live, setLive] = useState<Live>({ pools: [], orders: [], ok: false });
  const [liveState, setLiveState] = useState<LiveState>("connecting");
  const [lastTick, setLastTick] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [wallet, setWallet] = useState<Wallet>({ coins: "0ugnot", balances: {}, positions: {}, vests: {} });
  const [busy, setBusy] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pkgOverride, setPkgOverride] = useState(() => readPkgOverride(init.net || readSavedNet()));

  const d = copy;
  const net = NETS[netId] || NETS[DEFAULT_NET];
  const pkg = pkgOverride || live.pkg || net.pkg || PKG_PATH;
  const TABS = tabsFor(live.caps);
  const pools = live.pools || [];
  const featured = pools.find((p) => p.id === live.featuredId) || pools.find((p) => p.symbol === "ZTT") || null;
  const pool = pools.find((p) => p.id === poolId) || featured || pools[0] || null;

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok", hash = "") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, msg, kind, hash }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 9000);
  }, []);

  const writeUrl = useCallback((next: { netId: string; tab: Tab; poolId: string }) => {
    const u = new URL(window.location.href);
    u.searchParams.set("net", next.netId);
    u.searchParams.set("tab", next.tab);
    if (next.poolId) u.searchParams.set("pool", next.poolId);
    else u.searchParams.delete("pool");
    window.history.replaceState(null, "", u);
  }, []);

  const setNetId = useCallback(
    (id: string) => {
      if (!NETS[id] || id === netId) return;
      setNetIdState(id);
      setAccount(null);
      setWallet({ coins: "0ugnot", balances: {}, positions: {}, vests: {} });
      setPoolIdState("");
      setLive({ pools: [], orders: [], ok: false });
      setLiveState("connecting");
      setPkgOverride(readPkgOverride(id));
      try {
        localStorage.setItem(NET_KEY, id);
      } catch {
        /* ignore */
      }
      writeUrl({ netId: id, tab, poolId: "" });
    },
    [netId, tab, writeUrl],
  );

  const setTab = useCallback(
    (name: Tab) => {
      setTabState(name);
      writeUrl({ netId, tab: name, poolId });
    },
    [netId, poolId, writeUrl],
  );

  const followPkg = useCallback(
    (path: string) => {
      writePkgOverride(netId, path);
      setPkgOverride(path);
      setLive({ pools: [], orders: [], ok: false });
      setLiveState("connecting");
    },
    [netId],
  );

  const resetPkg = useCallback(() => followPkg(""), [followPkg]);

  const setPoolId = useCallback(
    (id: string) => {
      setPoolIdState(id);
      writeUrl({ netId, tab, poolId: id });
    },
    [netId, tab, writeUrl],
  );

  const tradePool = useCallback(
    (id: string) => {
      setPoolIdState(id);
      setTabState("swap");
      writeUrl({ netId, tab: "swap", poolId: id });
    },
    [netId, writeUrl],
  );

  const addLp = useCallback(
    (id: string) => {
      setPoolIdState(id);
      setTabState("liq");
      writeUrl({ netId, tab: "liq", poolId: id });
    },
    [netId, writeUrl],
  );

  const applyLive = useCallback(
    (data: Live) => {
      if (!data || !data.ok) return;
      const merged = { ...data, pools: mergeSparks(data.pools, netId) };
      setLive(merged);
      setLastTick(data.ts || Date.now());
      setLiveState("on");
      setPoolIdState((cur) => {
        if (cur && merged.pools.some((p) => p.id === cur)) return cur;
        return merged.featuredId || merged.pools[0]?.id || "";
      });
    },
    [netId],
  );

  const walletAddr = account?.address || net.viewAddr || "";
  const previewing = !account || account.source === "watch";

  const refreshWallet = useCallback(async () => {
    if (!walletAddr) return;
    try {
      const j = await api<Wallet>(`/api/wallet?addr=${encodeURIComponent(walletAddr)}&pkg=${encodeURIComponent(pkg)}`, netId);
      setWallet(j);
    } catch {
      /* ignore */
    }
  }, [walletAddr, pkg, netId]);

  const refreshLive = useCallback(async () => {
    try {
      const path = pkgOverride ? `/api/live?pkg=${encodeURIComponent(pkgOverride)}` : "/api/live";
      applyLive(await api<Live>(path, netId));
    } catch {
      setLiveState("err");
    }
  }, [applyLive, netId, pkgOverride]);

  useEffect(() => {
    let es: EventSource | undefined;
    void refreshLive();
    if (!pkgOverride && window.EventSource) {
      es = new EventSource(`/api/stream?net=${encodeURIComponent(netId)}`);
      es.onmessage = (ev) => {
        try {
          applyLive(JSON.parse(ev.data) as Live);
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => setLiveState("err");
    }
    const poll = setInterval(() => void refreshLive(), 8000);
    return () => {
      es?.close();
      clearInterval(poll);
    };
  }, [netId, pkgOverride, applyLive, refreshLive]);

  useEffect(() => {
    if (!tabsFor(live.caps).includes(tab)) setTabState("swap");
  }, [live.caps, tab]);

  useEffect(() => {
    void refreshWallet();
    const t = setInterval(() => void refreshWallet(), 10000);
    return () => clearInterval(t);
  }, [refreshWallet]);

  const connect = useCallback(async () => {
    if (!hasAdena()) throw new Error(d.installAdena);
    const acc = await connectAdena(net);
    setAccount(acc);
    toast(`${d.connected} · ${net.chainName}`);
    const j = await api<Wallet>(`/api/wallet?addr=${encodeURIComponent(acc.address)}&pkg=${encodeURIComponent(pkg)}`, netId);
    setWallet(j);
  }, [net, pkg, netId, toast, d]);

  const connectWatchAddr = useCallback(
    async (addr: string) => {
      const acc = connectWatch(addr, net);
      setAccount(acc);
      const j = await api<Wallet>(`/api/wallet?addr=${encodeURIComponent(acc.address)}&pkg=${encodeURIComponent(pkg)}`, netId);
      setWallet(j);
      toast(`${d.watch} ${acc.address.slice(0, 8)}…`);
    },
    [net, pkg, netId, toast, d],
  );

  const call = useCallback(
    async (func: string, args: string[], send = "", pkgPath = "") => {
      if (!account || account.source !== "adena") throw new Error(d.needWallet);
      const path = pkgPath || resolvePkgPath(func, live, pkg, net);
      if (!path) throw new Error(FUNC_SURFACE[func] === "incentives" ? d.noIncentivesPkg : "package path missing");
      return doContractCall({ caller: account.address, pkgPath: path, func, args, send });
    },
    [account, pkg, live, d, net],
  );

  const waitTx = useCallback(
    async (hash: string) => {
      if (!hash) return null;
      for (let i = 0; i < 24; i++) {
        try {
          const j = await api<TxResult>(`/api/tx?hash=${encodeURIComponent(hash)}`, netId);
          if (j && !j.pending && (j.height || j.ok)) {
            await refreshLive();
            await refreshWallet();
            return j;
          }
        } catch {
          /* still in mempool */
        }
        await sleep(1200);
      }
      return null;
    },
    [netId, refreshLive, refreshWallet],
  );

  const runTx = useCallback(
    async (label: string, fn: () => Promise<TxResult>) => {
      setBusy(label);
      try {
        const r = await fn();
        toast(d.pending, "pending", r?.hash || "");
        const done = await waitTx(r?.hash || "");
        if (done && done.ok !== false && !done.pending) toast(d.confirmed, "ok", r?.hash || "");
        else if (done && done.ok === false) toast(d.failed, "err", r?.hash || "");
        else toast(label, "ok", r?.hash || "");
        await refreshWallet();
        await refreshLive();
        return r;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), "err");
        throw e;
      } finally {
        setBusy("");
      }
    },
    [refreshWallet, refreshLive, toast, waitTx, d],
  );

  const gnoweb = `${live.gnoweb || net.gnoweb}/r/${pkg.replace(/^gno\.land\//, "")}`;
  const deadline = useMemo(() => {
    const h = Number(live.realmHeight || live.height || 0);
    return h > 0 ? String(h + 400) : "0";
  }, [live.realmHeight, live.height]);

  const value: DexValue = {
    TABS,
    followPkg,
    resetPkg,
    d,
    netId,
    net,
    setNetId,
    tab,
    setTab,
    poolId: pool?.id || "",
    setPoolId,
    tradePool,
    addLp,
    live,
    liveState,
    lastTick,
    pools,
    pool,
    featured,
    pkg,
    gnoweb,
    account,
    wallet,
    walletAddr,
    previewing,
    busy,
    toasts,
    setToasts,
    toast,
    connect,
    connectWatchAddr,
    call,
    runTx,
    waitTx,
    refreshWallet,
    refreshLive,
    deadline,
  };

  return <Dex.Provider value={value}>{children}</Dex.Provider>;
}

export function useDex(): DexValue {
  const v = useContext(Dex);
  if (!v) throw new Error("useDex outside provider");
  return v;
}
