import type { Caps, Gauge, Hub, Live, Network, Tab } from "../types";

export const ALL_TABS: Tab[] = ["swap", "pools", "liq", "book", "create", "port", "stats", "guide"];
export const NAV_TABS: Tab[] = ["swap", "pools", "liq", "book", "port", "guide"];

export const FUNC_SURFACE: Record<string, string> = {
  SwapExactIn: "swap",
  SwapExactOut: "swap",
  AddLiquidity: "lp",
  RemoveLiquidity: "lp",
  CreatePool: "create",
  PlaceBid: "book",
  PlaceAsk: "book",
  FillOrder: "book",
  CancelOrder: "book",
  ClaimFeeShare: "points",
  HarvestPoints: "points",
  CollectFees: "admin",
  ClaimVest: "lp",
  SetPaused: "admin",
  SetNextPkg: "admin",
  SetModule: "admin",
  Fund: "incentives",
  Claim: "incentives",
  Sync: "incentives",
};

const DEFAULT_CAPS: Caps = {
  poolList: true,
  exactOut: true,
  height: true,
  swap: true,
  lp: true,
  create: true,
  book: true,
  points: true,
  quote: true,
  feeShare: true,
  noStakeLp: true,
  incentives: false,
};

export function parseCapsList(raw: string | undefined, base?: Caps): Caps {
  const caps: Caps = { ...(base || DEFAULT_CAPS) };
  const parts = String(raw || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return caps;
  const set = new Set(parts);
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
  return caps;
}

export function parseHubSnapshot(raw: string | undefined, fallbackPkg = ""): Hub | null {
  const p = String(raw || "").split(";");
  if (p.length < 3 || !p[0]) return null;
  return {
    version: p[0],
    pkg: p[1] || fallbackPkg,
    nextPkg: p[2] || "",
    caps: parseCapsList(p.slice(3).join(";")),
    modules: {},
  };
}

export function parseModules(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
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

export function pkgForSurface(live: Live | undefined, surface: string, fallback: string): string {
  const mapped = live?.modules?.[surface];
  if (mapped) return mapped;
  return live?.pkg || fallback;
}

export function pkgForFunc(live: Live | undefined, func: string, fallback: string, incentivesPkg = ""): string {
  const surface = FUNC_SURFACE[func] || "admin";
  if (surface === "incentives") {
    return live?.modules?.incentives || live?.incentivesPkg || incentivesPkg || "";
  }
  return pkgForSurface(live, surface, fallback);
}

export function parseGaugeList(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const line of String(raw || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const id = t.split(";")[0].trim();
    if (id) out.push(id);
  }
  return out;
}

export function parseGaugeSnapshot(raw: string | undefined): Gauge | null {
  const p = String(raw || "").split(";");
  if (!p[0]) return null;
  const flag = (s: string | undefined) => s === "1" || s === "true" || s === "t";
  return {
    id: p[0],
    acc: p[1] || "0",
    totalFunded: p[2] || "0",
    on: p.length < 4 ? true : flag(p[3]),
    paused: flag(p[4]),
  };
}

export function gaugeFor(live: Live | undefined, poolId: string): Gauge | undefined {
  return live?.gauges?.find((g) => g.id === poolId);
}

export function isIncentivized(live: Live | undefined, poolId: string): boolean {
  const g = gaugeFor(live, poolId);
  return Boolean(g && g.on);
}

export function incentivesEnabled(net?: Pick<Network, "incentivesPkg">, caps?: Caps): boolean {
  if (net?.incentivesPkg) return true;
  return caps?.incentives === true;
}

export function tabsFor(caps?: Caps): Tab[] {
  return NAV_TABS.filter((t) => {
    if (t === "swap" || t === "pools") return caps?.swap !== false;
    if (t === "liq") return caps?.lp !== false;
    if (t === "book") return caps?.book !== false;
    return true;
  });
}

export const PKG_OVERRIDE_KEY = (netId: string) => `zdex.pkg.${netId}`;

export function readPkgOverride(netId: string): string {
  try {
    return localStorage.getItem(PKG_OVERRIDE_KEY(netId)) || "";
  } catch {
    return "";
  }
}

export function writePkgOverride(netId: string, pkg: string): void {
  try {
    if (pkg) localStorage.setItem(PKG_OVERRIDE_KEY(netId), pkg);
    else localStorage.removeItem(PKG_OVERRIDE_KEY(netId));
  } catch {
    /* ignore */
  }
}
