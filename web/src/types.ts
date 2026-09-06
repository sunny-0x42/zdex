export type Tab = "swap" | "pools" | "liq" | "book" | "create" | "port" | "stats" | "guide";

export type ChainToken = {
  symbol: string;
  name: string;
  key: string;
  decimals: number;
  pooled: boolean;
  internal: boolean;
  balance?: string;
  poolId?: string;
};
export type LiveState = "connecting" | "on" | "err";
export type WalletSource = "adena" | "watch";

export type Network = {
  id: string;
  chainId: string;
  chainName: string;
  rpcUrl: string;
  gnoweb: string;
  faucet: string;
  pkg: string;
  hubPkg?: string;
  incentivesPkg?: string;
  incentivesV2Pkg?: string;
  viewAddr: string;
};

export type Caps = {
  poolList: boolean;
  exactOut: boolean;
  height: boolean;
  swap?: boolean;
  lp?: boolean;
  create?: boolean;
  book?: boolean;
  points?: boolean;
  quote?: boolean;
  feeShare?: boolean;
  noStakeLp?: boolean;
  incentives?: boolean;
};

export type Gauge = {
  id: string;
  acc: string;
  totalFunded: string;
  on: boolean;
  paused: boolean;
  endH?: string;
  rewardPerBlock?: string;
  remaining?: string;
  pkg?: string;
};

export type Hub = {
  version: string;
  pkg: string;
  nextPkg: string;
  caps: Caps;
  modules: Record<string, string>;
};

export type Pool = {
  id: string;
  symbol: string;
  name: string;
  reserveU: string;
  reserveT: string;
  virtualU: string;
  totalLP: string;
  feeBps: number;
  launched: boolean;
  unlockH: string;
  snipeUntil: string;
  snipeMaxBps: string;
  creator: string;
  decimals: number;
  quote1gnot: string;
  spark: number[];
  volumeU?: string;
  tokensPerGnot?: number;
  priceUgnotPerToken?: number;
  supply?: string;
  key?: string;
};

export type Order = {
  id: string;
  pool: string;
  side: "bid" | "ask" | string;
  giveAmt: string;
  wantAmt: string;
  expireH: string;
  allOrNone: boolean;
  maker: string;
  price: number;
};

export type Live = {
  ok: boolean;
  ts?: number;
  latencyMs?: number;
  net?: string;
  rpc?: string;
  pkg?: string;
  chainId?: string;
  chainName?: string;
  gnoweb?: string;
  faucet?: string;
  viewAddr?: string;
  height?: string;
  realmHeight?: string;
  paused?: boolean;
  admin?: string;
  pools: Pool[];
  orders: Order[];
  caps?: Caps;
  featuredId?: string;
  mode?: string;
  version?: string;
  nextPkg?: string;
  modules?: Record<string, string>;
  incentivesPkg?: string;
  incentivesV2Pkg?: string;
  incentivesV2Live?: boolean;
  gauges?: Gauge[];
  error?: string;
};

export type Wallet = {
  addr?: string;
  coins: string;
  balances: Record<string, string>;
  positions: Record<string, string>;
  vests: Record<string, string>;
  points?: { life: string; epoch: string; closed: string; claimable: string };
  incentives?: Record<string, string>;
};

export type Account = {
  address: string;
  coins: string;
  chainId: string;
  source: WalletSource;
};

export type TxResult = {
  ok: boolean;
  hash?: string;
  height?: string;
  pending?: boolean;
  code?: number;
};

export type Toast = {
  id: string;
  msg: string;
  kind: "ok" | "err" | "pending";
  hash?: string;
};
