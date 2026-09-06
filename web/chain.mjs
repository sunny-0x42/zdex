/**
 * Shared Gno RPC helpers for the Node server and Vercel /api routes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NETWORKS, DEFAULT_NET, NETWORK, PKG_PATH, GRC20_REG } from "./config.js";

let __dirname = process.cwd();
try {
  if (import.meta && import.meta.url) {
    __dirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  /* Netlify CJS bundle has empty import.meta */
}
export const POLL_MS = 2500;
const HISTORY = 48;
const KNOWN_NAMES = { ZTT: "ZDEX Test", DEMO: "Demo", SDEM: "Sapphire Demo" };
const DATA_FILE = path.join(__dirname, "data", "spark.json");

export const liveByNet = new Map();
export const errorByNet = new Map();
const polling = new Set();
const priceHist = new Map();
const volStore = new Map();

loadStore();

export function getNet(id) {
  return NETWORKS[id] || NETWORKS[DEFAULT_NET];
}

function loadStore() {
  try {
    const j = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    for (const [k, v] of Object.entries(j.hist || {})) {
      if (Array.isArray(v)) priceHist.set(k, v.map(Number).filter((n) => n > 0).slice(-HISTORY));
    }
    for (const [k, v] of Object.entries(j.vol || {})) volStore.set(k, v);
  } catch {
    /* first run */
  }
}

function saveStore() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        hist: Object.fromEntries(priceHist),
        vol: Object.fromEntries(volStore),
        ts: Date.now(),
      }),
    );
  } catch {
    /* read-only fs (some serverless) */
  }
}

export async function rpc(net, method, params = {}) {
  const r = await fetch(net.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

function b64utf8(b64) {
  if (!b64) return "";
  return Buffer.from(b64, "base64").toString("utf8");
}

function parseQeval(text) {
  const m = String(text || "").match(/^\((.*)\)\s*$/s);
  if (!m) return text;
  const inner = m[1].trim();
  const sm = inner.match(/^"(.*)"\s+string$/s);
  if (sm) return sm[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  const nm = inner.match(/^(-?\d+)\s+\w+$/);
  if (nm) return nm[1];
  const bm = inner.match(/^(true|false)\s+bool$/);
  if (bm) return bm[1] === "true";
  const am = inner.match(/"(g1[a-z0-9]+)"/);
  if (am) return am[1];
  return inner;
}

function parseNums(text) {
  return [...String(text || "").matchAll(/\((-?\d+)\s+\w+\)/g)].map((m) => m[1]);
}

export async function qeval(net, pkg, expr) {
  const data = Buffer.from(`${pkg}.${expr}`, "utf8").toString("base64");
  const result = await rpc(net, "abci_query", { path: "vm/qeval", data, height: "0", prove: false });
  const rb = result?.response?.ResponseBase;
  if (rb?.Error) {
    const err = typeof rb.Error === "string" ? rb.Error : JSON.stringify(rb.Error);
    throw new Error(err);
  }
  return parseQeval(b64utf8(rb?.Data));
}

async function qevalRaw(net, pkg, expr) {
  const data = Buffer.from(`${pkg}.${expr}`, "utf8").toString("base64");
  const result = await rpc(net, "abci_query", { path: "vm/qeval", data, height: "0", prove: false });
  const rb = result?.response?.ResponseBase;
  if (rb?.Error) {
    const err = typeof rb.Error === "string" ? rb.Error : JSON.stringify(rb.Error);
    throw new Error(err);
  }
  return b64utf8(rb?.Data);
}

async function qrender(net, pkg, renderPath = "") {
  const data = Buffer.from(`${pkg}:${renderPath}`, "utf8").toString("base64");
  const result = await rpc(net, "abci_query", { path: "vm/qrender", data, height: "0", prove: false });
  const rb = result?.response?.ResponseBase;
  if (rb?.Error) {
    const err = typeof rb.Error === "string" ? rb.Error : JSON.stringify(rb.Error);
    throw new Error(err);
  }
  return b64utf8(rb?.Data);
}

function parseHub(raw, fallbackPkg, baseCaps) {
  const p = String(raw || "").split(";");
  if (p.length < 3 || !p[0]) return null;
  const caps = { ...(baseCaps || {}) };
  const capParts = p.slice(3).map((s) => s.trim()).filter(Boolean);
  if (capParts.length) {
    const set = new Set(capParts);
    caps.swap = set.has("swap");
    caps.lp = set.has("lp");
    caps.create = set.has("create");
    caps.book = set.has("book");
    caps.points = set.has("points");
    caps.quote = set.has("quote");
    caps.feeShare = set.has("feeShare");
    caps.noStakeLp = set.has("noStakeLp");
    caps.incentives = set.has("incentives");
    if (set.has("quote")) caps.exactOut = true;
  }
  return { version: p[0], pkg: p[1] || fallbackPkg, nextPkg: p[2] || "", caps };
}

function parseModules(raw) {
  const out = {};
  for (const line of String(raw || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const i = t.indexOf(";");
    if (i <= 0) continue;
    const name = t.slice(0, i).trim();
    const pkg = t.slice(i + 1).trim();
    if (name && pkg) out[name] = pkg;
  }
  return out;
}

async function loadHub(net, pkg, baseCaps) {
  let version = "";
  let nextPkg = "";
  let modules = {};
  let caps = { ...(baseCaps || {}) };
  try {
    const hub = parseHub(await qeval(net, pkg, "HubSnapshot()"), pkg, caps);
    if (hub) {
      version = hub.version;
      nextPkg = hub.nextPkg;
      caps = { ...caps, ...hub.caps };
    }
  } catch {
    try {
      version = String(await qeval(net, pkg, "Version()"));
    } catch {
      /* pre-hub realm */
    }
  }
  try {
    modules = parseModules(await qeval(net, pkg, "Modules()"));
  } catch {
    /* pre-hub realm */
  }
  return { version, nextPkg, modules, caps };
}

function parseSnap(line) {
  const p = String(line).split(";");
  if (p.length < 13) return null;
  const reserveU = Number(p[3]);
  const reserveT = Number(p[4]);
  const virtualU = Number(p[5]);
  const effU = reserveU + virtualU;
  return {
    id: p[0],
    symbol: p[1],
    name: p[2],
    reserveU: p[3],
    reserveT: p[4],
    virtualU: p[5],
    totalLP: p[6],
    feeBps: Number(p[7]),
    launched: p[8] === "1",
    unlockH: p[9],
    snipeUntil: p[10],
    snipeMaxBps: p[11],
    creator: p[12],
    decimals: Number(p[13] || 0),
    priceUgnotPerToken: reserveT > 0 ? effU / reserveT : 0,
    tokensPerGnot: effU > 0 ? (1_000_000 * reserveT) / effU : 0,
  };
}

function parseOrder(line) {
  const p = String(line).split(";");
  if (p.length < 8) return null;
  return {
    id: p[0],
    pool: p[1],
    side: p[2],
    giveAmt: p[3],
    wantAmt: p[4],
    expireH: p[5],
    allOrNone: p[6] === "1",
    maker: p[7],
    price: Number(p[3]) > 0 ? Number(p[4]) / Number(p[3]) : 0,
  };
}

function parseHomePools(md) {
  const pools = [];
  const re =
    /\|\s*\[([^\]]+)\]\(pool\/([^)]+)\)\s*\|\s*(-?\d+)\s*\|\s*(-?\d+)\s*\|\s*(-?\d+)\s*\|\s*(\d+)\s*bps\s*\|\s*(yes|no)/gi;
  let m;
  while ((m = re.exec(md))) {
    const symbol = m[1];
    const ru = Number(m[3]);
    const rt = Number(m[4]);
    const vu = Number(m[5]);
    const effU = ru + vu;
    pools.push({
      id: m[2],
      symbol,
      name: KNOWN_NAMES[symbol] || symbol,
      reserveU: m[3],
      reserveT: m[4],
      virtualU: m[5],
      totalLP: "0",
      feeBps: Number(m[6]),
      launched: m[7].toLowerCase() === "yes",
      unlockH: "0",
      snipeUntil: "0",
      snipeMaxBps: "0",
      creator: "",
      decimals: 0,
      priceUgnotPerToken: rt > 0 ? effU / rt : 0,
      tokensPerGnot: effU > 0 ? (1_000_000 * rt) / effU : 0,
    });
  }
  return pools;
}

function parseBookOrders(md) {
  const orders = [];
  const re =
    /\|\s*(\d+)\s*\|\s*(bid|ask)\s*\|\s*(\S+)\s*\|\s*(-?\d+)\s*\|\s*(-?\d+)\s*\|\s*`?(g1[a-z0-9]+)`?/gi;
  let m;
  while ((m = re.exec(md))) {
    orders.push({
      id: m[1],
      pool: m[3],
      side: m[2].toLowerCase(),
      giveAmt: m[4],
      wantAmt: m[5],
      expireH: "0",
      allOrNone: false,
      maker: m[6],
      price: Number(m[4]) > 0 ? Number(m[5]) / Number(m[4]) : 0,
    });
  }
  return orders;
}

function enrichPool(row) {
  const ru = Number(row.reserveU);
  const rt = Number(row.reserveT);
  const vu = Number(row.virtualU);
  const effU = ru + vu;
  row.priceUgnotPerToken = rt > 0 ? effU / rt : 0;
  row.tokensPerGnot = effU > 0 ? (1_000_000 * rt) / effU : 0;
  if (!row.name) row.name = KNOWN_NAMES[row.symbol] || row.symbol;
  return row;
}

function sortPools(pools) {
  return pools.sort((a, b) => {
    if (a.symbol === "ZTT" && b.symbol !== "ZTT") return -1;
    if (b.symbol === "ZTT" && a.symbol !== "ZTT") return 1;
    return Number(b.reserveU) - Number(a.reserveU);
  });
}

function pushHist(netId, id, value) {
  if (!Number.isFinite(value) || value <= 0) return [];
  const key = `${netId}:${id}`;
  const arr = priceHist.get(key) || [];
  if (arr[arr.length - 1] !== value) arr.push(value);
  while (arr.length > HISTORY) arr.shift();
  priceHist.set(key, arr);
  return arr;
}

function trackVolume(netId, pool) {
  const key = `${netId}:${pool.id}`;
  const ru = Number(pool.reserveU) || 0;
  const prev = volStore.get(key) || { lastReserveU: ru, window: [] };
  const now = Date.now();
  const window = (prev.window || []).filter((x) => now - x.t < 86_400_000);
  if (prev.lastReserveU != null && ru !== prev.lastReserveU) {
    window.push({ t: now, u: Math.abs(ru - prev.lastReserveU) });
  }
  const volumeU = window.reduce((s, x) => s + x.u, 0);
  volStore.set(key, { lastReserveU: ru, window, volumeU });
  pool.volumeU = String(volumeU);
}

function parseGaugeList(raw) {
  const out = [];
  for (const line of String(raw || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const id = t.split(";")[0].trim();
    if (id) out.push(id);
  }
  return out;
}

function parseGaugeSnapshot(raw) {
  const p = String(raw || "").split(";");
  if (!p[0]) return null;
  const flag = (s) => s === "1" || s === "true" || s === "t";
  return {
    id: p[0],
    acc: p[1] || "0",
    totalFunded: p[2] || "0",
    on: p.length < 4 ? true : flag(p[3]),
    paused: flag(p[4]),
    endH: p[5] || "",
    rewardPerBlock: p[6] || "0",
    remaining: p[7] || "",
  };
}

async function loadIncentivesPkg(net, pkg) {
  if (!pkg) return [];
  try {
    const ids = parseGaugeList(await qeval(net, pkg, "GaugeList()"));
    return (
      await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = parseGaugeSnapshot(await qeval(net, pkg, `GaugeSnapshot(${JSON.stringify(id)})`));
            const g = snap || { id, acc: "0", totalFunded: "0", on: true, paused: false };
            g.pkg = pkg;
            return g;
          } catch {
            return { id, acc: "0", totalFunded: "0", on: true, paused: false, pkg };
          }
        }),
      )
    ).filter(Boolean);
  } catch {
    return [];
  }
}

async function loadIncentives(net) {
  const gauges = [];
  let v2Live = false;
  if (net.incentivesPkg) gauges.push(...(await loadIncentivesPkg(net, net.incentivesPkg)));
  if (net.incentivesV2Pkg) {
    try {
      const ver = String(await qeval(net, net.incentivesV2Pkg, "Version()"));
      v2Live = Boolean(ver);
    } catch {
      v2Live = false;
    }
    if (v2Live) gauges.push(...(await loadIncentivesPkg(net, net.incentivesV2Pkg)));
  }
  return { pkg: net.incentivesPkg || "", gauges, v2Live };
}

async function attachQuotes(net, pkg, netId, pools) {
  await Promise.all(
    pools.map(async (row) => {
      try {
        const quote = await qeval(net, pkg, `Quote(${JSON.stringify(row.id)}, "ugnot", 1000000)`);
        row.quote1gnot = String(quote);
      } catch {
        row.quote1gnot = String(Math.round(row.tokensPerGnot || 0));
      }
      row.spark = pushHist(netId, row.id, Number(row.quote1gnot) || row.tokensPerGnot);
      trackVolume(netId, row);
    }),
  );
}

async function loadLiveV2(net, pkg) {
  const [pausedV, adminV, heightV, listV, ordersV] = await Promise.all([
    qeval(net, pkg, "Paused()"),
    qeval(net, pkg, "Admin()"),
    qeval(net, pkg, "Height()"),
    qeval(net, pkg, "PoolList()"),
    qeval(net, pkg, "OrderList()"),
  ]);
  const ids = String(listV || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const rows = await Promise.all(
    ids.map(async (id) => parseSnap(await qeval(net, pkg, `PoolSnapshot(${JSON.stringify(id)})`))),
  );
  const pools = [];
  for (const row of rows) if (row) pools.push(enrichPool(row));
  const orders = [];
  for (const line of String(ordersV || "").split("\n").map((s) => s.trim()).filter(Boolean)) {
    const o = parseOrder(line);
    if (o) orders.push(o);
  }
  const hub = await loadHub(net, pkg, { poolList: true, exactOut: true, height: true });
  return {
    paused: Boolean(pausedV),
    admin: String(adminV),
    realmHeight: String(heightV),
    pools,
    orders,
    caps: hub.caps,
    version: hub.version,
    nextPkg: hub.nextPkg,
    modules: hub.modules,
  };
}

async function loadLiveV1(net, pkg, chainHeight) {
  let paused = false;
  let admin = "";
  try {
    paused = Boolean(await qeval(net, pkg, "Paused()"));
  } catch {
    /* ignore */
  }
  try {
    admin = String(await qeval(net, pkg, "Admin()"));
  } catch {
    /* ignore */
  }
  const home = await qrender(net, pkg, "");
  const pools = parseHomePools(home);
  let realmHeight = String(chainHeight || "");
  await Promise.all(
    pools.map(async (p) => {
      try {
        const nums = parseNums(await qevalRaw(net, pkg, `PoolInfo(${JSON.stringify(p.id)})`));
        if (nums.length >= 5) {
          p.reserveU = nums[0];
          p.reserveT = nums[1];
          p.virtualU = nums[2];
          p.totalLP = nums[3];
          p.feeBps = Number(nums[4]);
          enrichPool(p);
        }
      } catch {
        /* keep render */
      }
      try {
        const page = await qrender(net, pkg, `pool/${p.id}`);
        const unlock = page.match(/Unlock height:\s*(\d+)\s*\(now\s*(\d+)\)/i);
        if (unlock) {
          p.unlockH = unlock[1];
          realmHeight = unlock[2];
        }
        const lp = page.match(/\* LP:\s*(\d+)/i);
        if (lp) p.totalLP = lp[1];
        const snipe = page.match(/Snipe cap:\s*(\d+)\s*bps until height\s*(\d+)/i);
        if (snipe) {
          p.snipeMaxBps = snipe[1];
          p.snipeUntil = snipe[2];
        }
      } catch {
        /* optional */
      }
    }),
  );
  let orders = [];
  try {
    orders = parseBookOrders(await qrender(net, pkg, "book"));
  } catch {
    orders = [];
  }
  const hub = await loadHub(net, pkg, { poolList: false, exactOut: false, height: false, swap: true, lp: true, create: true, book: true });
  return {
    paused,
    admin,
    realmHeight,
    pools,
    orders,
    caps: hub.caps,
    version: hub.version,
    nextPkg: hub.nextPkg,
    modules: hub.modules,
  };
}

export async function loadLive(netId, pkgOverride) {
  const net = getNet(netId);
  const pkg = pkgOverride || net.pkg;
  const t0 = Date.now();
  const status = await rpc(net, "status");
  const si = status?.sync_info || {};
  const height = String(si.latest_block_height || "");
  let body;
  let mode = "v2";
  let err = "";
  try {
    body = await loadLiveV2(net, pkg);
  } catch (e) {
    mode = "v1";
    err = String(e.message || e);
    body = await loadLiveV1(net, pkg, height);
  }
  await attachQuotes(net, pkg, net.id, body.pools);
  sortPools(body.pools);
  saveStore();
  let incentives = { pkg: net.incentivesPkg || "", gauges: [] };
  try {
    incentives = await loadIncentives(net);
  } catch {
    /* Pearl sidecar may not be addpkg'd yet */
  }
  const featured = body.pools.find((p) => p.symbol === "ZTT") || body.pools[0] || null;
  return {
    ok: true,
    ts: Date.now(),
    latencyMs: Date.now() - t0,
    net: net.id,
    rpc: net.rpcUrl,
    pkg,
    chainId: status?.node_info?.network || net.chainId,
    chainName: net.chainName,
    gnoweb: net.gnoweb,
    faucet: net.faucet || "",
    viewAddr: net.viewAddr || "",
    height,
    realmHeight: body.realmHeight || height,
    blockTime: si.latest_block_time || "",
    paused: body.paused,
    admin: body.admin,
    pools: body.pools,
    orders: body.orders,
    caps: body.caps,
    featuredId: featured?.id || "",
    mode,
    version: body.version || "",
    nextPkg: body.nextPkg || "",
    modules: body.modules || {},
    incentivesPkg: net.incentivesPkg || "",
    incentivesV2Pkg: net.incentivesV2Pkg || "",
    incentivesV2Live: Boolean(incentives.v2Live),
    gauges: incentives.gauges || [],
    error: mode === "v1" && /not declared/i.test(err) ? "" : err && mode === "v2" ? err : "",
  };
}

export async function getLive(netId, pkgParam) {
  const net = getNet(netId);
  const pkg = pkgParam || net.pkg;
  const cacheKey = `${net.id}::${pkg}`;
  const cached = liveByNet.get(cacheKey) || (pkg === net.pkg ? liveByNet.get(net.id) : null);
  if (cached && cached.pkg === pkg && Date.now() - cached.ts < POLL_MS * 2) return cached;
  const snap = await loadLive(net.id, pkg);
  liveByNet.set(cacheKey, snap);
  if (pkg === net.pkg) liveByNet.set(net.id, snap);
  errorByNet.set(net.id, snap.error || "");
  return snap;
}

export async function pollNet(netId) {
  const net = getNet(netId);
  if (polling.has(netId)) return liveByNet.get(netId);
  polling.add(netId);
  try {
    const snap = await loadLive(netId);
    liveByNet.set(net.id, snap);
    liveByNet.set(`${net.id}::${net.pkg}`, snap);
    errorByNet.set(net.id, snap.error || "");
    return snap;
  } catch (e) {
    errorByNet.set(net.id, String(e.message || e));
    throw e;
  } finally {
    polling.delete(netId);
  }
}

export async function quoteExactIn(netId, pool, tokenIn, amountIn, pkgParam) {
  const net = getNet(netId);
  const pkg = pkgParam || net.pkg;
  if (!pool) throw new Error("pkg and pool required");
  const out = await qeval(net, pkg, `Quote(${JSON.stringify(pool)}, ${JSON.stringify(tokenIn || "ugnot")}, ${amountIn || "0"})`);
  return { amountOut: String(out), source: "chain" };
}

export async function loadWallet(net, pkg, addr, live) {
  let coins = "0ugnot";
  try {
    const acct = await rpc(net, "abci_query", { path: `auth/accounts/${addr}`, data: "", height: "0", prove: false });
    const raw = b64utf8(acct?.response?.ResponseBase?.Data);
    const m = raw.match(/(\d+)ugnot/);
    if (m) coins = `${m[1]}ugnot`;
  } catch {
    /* empty */
  }
  const symbols = (live?.pools || []).map((p) => p.symbol);
  const balances = {};
  const positions = {};
  const vests = {};
  for (const sym of symbols) {
    try {
      balances[sym] = String(await qeval(net, pkg, `BalanceOf(${JSON.stringify(sym)}, "${addr}")`));
    } catch {
      balances[sym] = "0";
    }
    try {
      const id = `ugnot|${sym}`;
      positions[id] = String(await qeval(net, pkg, `PositionOf(${JSON.stringify(id)}, "${addr}")`));
    } catch {
      positions[`ugnot|${sym}`] = "0";
    }
    try {
      vests[sym] = String(await qeval(net, pkg, `VestingOf(${JSON.stringify(sym)}, "${addr}")`));
    } catch {
      vests[sym] = "";
    }
  }
  let points = { life: "0", epoch: "0", closed: "0", claimable: "0" };
  try {
    const raw = String(await qeval(net, pkg, `PointsSnapshot("${addr}")`));
    const p = raw.split(";");
    if (p.length >= 4) points = { life: p[0], epoch: p[1], closed: p[2], claimable: p[3] };
  } catch {
    /* realm without points */
  }
  const incentives = {};
  const gaugeRows = live?.gauges || [];
  if (gaugeRows.length) {
    await Promise.all(
      gaugeRows.map(async (g) => {
        const id = g.id;
        const pkg = g.pkg || net.incentivesPkg || "";
        if (!id || !pkg) return;
        try {
          const n = String(await qeval(net, pkg, `Claimable(${JSON.stringify(id)}, ${JSON.stringify(addr)})`));
          const prev = BigInt(incentives[id] || "0");
          incentives[id] = (prev + BigInt(n || "0")).toString();
        } catch {
          if (incentives[id] == null) incentives[id] = "0";
        }
      }),
    );
  }
  return { addr, coins, balances, positions, vests, points, incentives, net: net.id };
}

function hashAttempts(hash) {
  const raw = String(hash || "").replace(/^0x/i, "");
  const out = [raw, raw.toUpperCase(), raw.toLowerCase()];
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    try {
      out.unshift(Buffer.from(raw, "hex").toString("base64"));
    } catch {
      /* ignore */
    }
  }
  return [...new Set(out.filter(Boolean))];
}

export async function fetchTx(netId, hash) {
  const net = getNet(netId);
  const raw = String(hash || "").replace(/^0x/i, "");
  if (!raw) throw new Error("hash required");
  let lastErr = "not found";
  for (const h of hashAttempts(raw)) {
    try {
      const result = await rpc(net, "tx", { hash: h, prove: false });
      if (!result) continue;
      const tr = result.tx_result || result.TxResult || {};
      const rb = tr.ResponseBase || {};
      const height = String(result.height || tr.height || "");
      const err = rb.Error;
      const code = Number(tr.code ?? result.code ?? (err ? 1 : 0));
      return {
        ok: !err && code === 0,
        pending: false,
        hash: raw,
        height,
        code,
        log: tr.log || rb.Log || result.log || "",
      };
    } catch (e) {
      lastErr = String(e.message || e);
    }
  }
  return { ok: false, pending: true, hash: raw, error: lastErr };
}

export async function preflight(netId, q) {
  const net = getNet(netId);
  const pkg = q.pkg || net.pkg;
  const live = await getLive(netId, pkg);
  const errors = [];
  const warnings = [];
  if (live.paused) errors.push("paused");
  const p = (live.pools || []).find((x) => x.id === q.pool);
  if (!p) errors.push("pool_not_found");
  let amountOut = "0";
  if (p) {
    try {
      amountOut = String(
        await qeval(net, pkg, `Quote(${JSON.stringify(q.pool)}, ${JSON.stringify(q.tokenIn || "ugnot")}, ${q.amountIn || "0"})`),
      );
    } catch (e) {
      errors.push("quote_failed");
      warnings.push(String(e.message || e));
    }
  }
  const h = Number(live.realmHeight || live.height || 0);
  if (p && p.snipeUntil && h < Number(p.snipeUntil)) {
    warnings.push("snipe");
    const cap = Math.floor((Number(p.reserveT) * Number(p.snipeMaxBps || 0)) / 10000);
    if (q.tokenIn === "ugnot" && cap > 0 && Number(amountOut) > cap) errors.push("snipe_cap");
  }
  if (q.addr && q.tokenIn === "ugnot" && q.amountIn) {
    try {
      const w = await loadWallet(net, pkg, q.addr, live);
      const m = String(w.coins).match(/(\d+)/);
      const bal = BigInt(m ? m[1] : "0");
      if (bal < BigInt(q.amountIn)) errors.push("insufficient_gnot");
    } catch {
      warnings.push("balance_unknown");
    }
  }
  if (q.minOut && BigInt(amountOut || "0") < BigInt(q.minOut)) errors.push("slippage");
  return {
    ok: errors.length === 0,
    amountOut,
    source: "chain",
    warnings,
    errors,
    paused: live.paused,
    height: h,
    pool: p
      ? { id: p.id, symbol: p.symbol, snipeUntil: p.snipeUntil, snipeMaxBps: p.snipeMaxBps, feeBps: p.feeBps }
      : null,
  };
}

export async function platformStats(netId, pkgParam) {
  const live = await getLive(netId, pkgParam);
  const net = getNet(netId);
  const pkg = pkgParam || live.pkg || net.pkg;
  let poolCount = (live.pools || []).length;
  let orderCount = (live.orders || []).length;
  try {
    poolCount = Number(await qeval(net, pkg, "PoolCount()"));
  } catch {
    /* keep live */
  }
  try {
    orderCount = Number(await qeval(net, pkg, "OrderCount()"));
  } catch {
    /* keep live */
  }
  const tvlU = (live.pools || []).reduce((s, p) => s + (Number(p.reserveU) || 0), 0);
  const volumeU = (live.pools || []).reduce((s, p) => s + (Number(p.volumeU) || 0), 0);
  const virtualU = (live.pools || []).reduce((s, p) => s + (Number(p.virtualU) || 0), 0);
  const pools = await Promise.all(
    (live.pools || []).map(async (p) => {
      let supply = "";
      let key = "";
      try {
        supply = String(await qeval(net, pkg, `TotalSupply(${JSON.stringify(p.symbol)})`));
      } catch {
        /* v1 ok */
      }
      try {
        key = String(await qeval(net, pkg, `TokenKey(${JSON.stringify(p.symbol)})`));
      } catch {
        /* ignore */
      }
      return { ...p, supply, key };
    }),
  );
  let epoch = { id: "0", endH: "0", pot: "0", pts: "0", closedPot: "0", closedPts: "0" };
  try {
    const raw = String(await qeval(net, pkg, "EpochSnapshot()"));
    const e = raw.split(";");
    if (e.length >= 7) {
      epoch = { id: e[0], endH: e[1], pot: e[2], pts: e[3], closedPot: e[5], closedPts: e[6] };
    }
  } catch {
    /* v1 */
  }
  return {
    ok: true,
    ts: Date.now(),
    chainId: live.chainId,
    chainName: live.chainName,
    height: live.height,
    realmHeight: live.realmHeight,
    rpc: live.rpc,
    pkg,
    gnoweb: live.gnoweb,
    admin: live.admin,
    paused: live.paused,
    mode: live.mode,
    caps: live.caps,
    version: live.version || "",
    nextPkg: live.nextPkg || "",
    modules: live.modules || {},
    latencyMs: live.latencyMs,
    poolCount,
    orderCount,
    tvlU: String(Math.round(tvlU)),
    volumeU: String(Math.round(volumeU)),
    virtualU: String(Math.round(virtualU)),
    launched: pools.filter((p) => p.launched).length,
    graduated: pools.filter((p) => Number(p.virtualU) === 0).length,
    pools,
    orders: live.orders || [],
    epoch,
  };
}

function parseCatalogLine(line) {
  const p = String(line || "").split(";");
  if (p.length < 3 || !p[0]) return null;
  return {
    symbol: p[0],
    name: p[1] || p[0],
    key: p[2] || p[0],
    decimals: Number(p[3] || 0),
    pooled: p[4] === "1",
    internal: p[5] === "1",
  };
}

function parseRegLine(line) {
  const p = String(line || "").split(";");
  if (p.length < 2 || !p[0]) return null;
  return {
    key: p[0],
    symbol: p[1],
    name: p[2] || p[1],
    decimals: Number(p[3] || 0),
    pooled: false,
    internal: false,
  };
}

function mergeToken(into, row) {
  if (!row?.symbol) return;
  const prev = into.get(row.symbol) || {};
  into.set(row.symbol, {
    symbol: row.symbol,
    name: row.name || prev.name || row.symbol,
    key: row.key || prev.key || row.symbol,
    decimals: row.decimals || prev.decimals || 0,
    pooled: Boolean(row.pooled || prev.pooled),
    internal: Boolean(row.internal || prev.internal),
  });
}

export async function loadTokenCatalog(netId, pkgParam) {
  const net = getNet(netId);
  const pkg = pkgParam || net.pkg;
  const bySym = new Map();
  const live = await getLive(netId, pkg).catch(() => null);
  for (const p of live?.pools || []) {
    mergeToken(bySym, {
      symbol: p.symbol,
      name: p.name,
      key: p.key || p.symbol,
      decimals: p.decimals || 0,
      pooled: true,
      internal: false,
    });
  }
  try {
    for (const line of String(await qeval(net, pkg, "TokenCatalog()")).split("\n")) {
      mergeToken(bySym, parseCatalogLine(line));
    }
  } catch {
    /* older realm */
  }
  try {
    for (const line of String(await qeval(net, GRC20_REG, "Snapshot()")).split("\n")) {
      mergeToken(bySym, parseRegLine(line));
    }
  } catch {
    /* registry without Snapshot */
  }
  let realmAddr = "";
  try {
    realmAddr = String(await qeval(net, pkg, "RealmAddr()"));
  } catch {
    /* ignore */
  }
  const tokens = [...bySym.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  return { ok: true, pkg, realmAddr, registry: GRC20_REG, tokens };
}

export async function lookupToken(netId, ref, pkgParam, addr) {
  const net = getNet(netId);
  const pkg = pkgParam || net.pkg;
  const raw = String(ref || "").trim();
  if (!raw) return { ok: false, error: "ref required" };
  let row = null;
  try {
    row = parseCatalogLine(await qeval(net, pkg, `LookupToken(${JSON.stringify(raw)})`));
  } catch {
    row = null;
  }
  if (!row) {
    const cat = await loadTokenCatalog(netId, pkg);
    row = cat.tokens.find((t) => t.symbol === raw || t.key === raw || raw.endsWith("." + t.symbol)) || null;
  }
  if (!row) return { ok: false, found: false, ref: raw };
  const balRef = row.internal ? row.symbol : row.key || row.symbol;
  let balance = "0";
  if (addr) {
    try {
      balance = String(await qeval(net, pkg, `BalanceOf(${JSON.stringify(balRef)}, "${addr}")`));
    } catch {
      try {
        balance = String(await qeval(net, pkg, `BalanceOf(${JSON.stringify(row.symbol)}, "${addr}")`));
      } catch {
        balance = "0";
      }
    }
  }
  let realmAddr = "";
  try {
    realmAddr = String(await qeval(net, pkg, "RealmAddr()"));
  } catch {
    /* ignore */
  }
  return { ok: true, found: true, ...row, poolId: `ugnot|${row.symbol}`, balance, realmAddr, registry: GRC20_REG };
}

export async function dispatch(pathname, search) {
  const netId = search.get("net") || DEFAULT_NET;
  const net = getNet(netId);
  const pkgParam = search.get("pkg") || net.pkg;

  if (pathname === "/api/health") {
    return {
      status: 200,
      body: {
        ok: true,
        defaultNet: DEFAULT_NET,
        rpc: NETWORK.rpcUrl,
        pkg: PKG_PATH,
        live: !!liveByNet.get(DEFAULT_NET),
        nets: Object.keys(NETWORKS),
        error: errorByNet.get(DEFAULT_NET) || "",
      },
    };
  }
  if (pathname === "/api/networks") {
    return {
      status: 200,
      body: Object.values(NETWORKS).map((n) => ({
        id: n.id,
        chainId: n.chainId,
        chainName: n.chainName,
        rpcUrl: n.rpcUrl,
        gnoweb: n.gnoweb,
        faucet: n.faucet || "",
        pkg: n.pkg,
        hubPkg: n.hubPkg || "",
        incentivesPkg: n.incentivesPkg || "",
      })),
    };
  }
  if (pathname === "/api/live") {
    return { status: 200, body: await getLive(net.id, pkgParam) };
  }
  if (pathname === "/api/tokens") {
    return { status: 200, body: await loadTokenCatalog(net.id, pkgParam) };
  }
  if (pathname === "/api/token") {
    const ref = search.get("ref") || "";
    const addr = search.get("addr") || "";
    return { status: 200, body: await lookupToken(net.id, ref, pkgParam, addr) };
  }
  if (pathname === "/api/quote") {
    const pool = search.get("pool") || "";
    const tokenIn = search.get("tokenIn") || "ugnot";
    const amountIn = search.get("amountIn") || "0";
    return { status: 200, body: await quoteExactIn(net.id, pool, tokenIn, amountIn, pkgParam) };
  }
  if (pathname === "/api/wallet") {
    const addr = search.get("addr") || "";
    if (!addr) throw new Error("addr required");
    const live = liveByNet.get(net.id) || (await getLive(net.id, pkgParam));
    return { status: 200, body: await loadWallet(net, pkgParam, addr, live) };
  }
  if (pathname === "/api/eval") {
    const expr = search.get("expr") || "";
    if (!expr) throw new Error("pkg and expr required");
    return { status: 200, body: { value: await qeval(net, pkgParam, expr) } };
  }
  if (pathname === "/api/tx") {
    return { status: 200, body: await fetchTx(net.id, search.get("hash") || "") };
  }
  if (pathname === "/api/preflight") {
    return {
      status: 200,
      body: await preflight(net.id, {
        pkg: pkgParam,
        pool: search.get("pool") || "",
        tokenIn: search.get("tokenIn") || "ugnot",
        amountIn: search.get("amountIn") || "0",
        minOut: search.get("minOut") || "",
        addr: search.get("addr") || "",
      }),
    };
  }
  if (pathname === "/api/stats") {
    return { status: 200, body: await platformStats(net.id, pkgParam) };
  }
  if (pathname === "/api/stream") {
    return { status: 501, body: { error: "SSE only on the Node server; poll /api/live" } };
  }
  return null;
}

export { NETWORKS, DEFAULT_NET, NETWORK, PKG_PATH };
