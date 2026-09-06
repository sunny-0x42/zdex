import type { Account, Live, Network } from "../types";
import { pkgForFunc } from "./hub";

export function resolvePkgPath(func: string, live: Live | undefined, dexPkg: string, net?: Pick<Network, "incentivesPkg">): string {
  return pkgForFunc(live, func, dexPkg, net?.incentivesPkg || "");
}

export function hasAdena(): boolean {
  return typeof window !== "undefined" && !!window.adena;
}

function assertAdena(): NonNullable<Window["adena"]> {
  if (!hasAdena() || !window.adena) {
    const err = new Error("NO_ADENA");
    throw err;
  }
  return window.adena;
}

function ok(res: { code?: number; status?: string; type?: string; message?: string } | null) {
  if (!res) throw new Error("Adena did not respond");
  if (res.code === 0 || res.status === "success") return res;
  if (res.type === "CONNECTION_SUCCESS" || /already/i.test(res.message || "")) return res;
  throw new Error(res.message || res.type || `Adena error ${res.code}`);
}

export async function connectAdena(network: Network): Promise<Account> {
  const adena = assertAdena();
  const est = await adena.AddEstablish("zdex");
  if (est && est.code !== 0 && est.type !== "CONNECTION_SUCCESS" && !/already/i.test(est.message || "")) {
    if (est.code !== 4000 && est.code !== 4001) ok(est);
  }
  try {
    await adena.AddNetwork({ chainId: network.chainId, chainName: network.chainName, rpcUrl: network.rpcUrl });
  } catch {
    /* already added */
  }
  try {
    await adena.SwitchNetwork(network.chainId);
  } catch {
    /* ignore */
  }
  const acc = ok(await adena.GetAccount()) as { data?: { address?: string; coins?: string; chainId?: string } };
  const d = acc.data || {};
  if (!d.address || !/^g1/i.test(d.address)) throw new Error("Adena did not return a g1 address");
  return { address: d.address, coins: d.coins || "", chainId: d.chainId || network.chainId, source: "adena" };
}

export function connectWatch(address: string, network: Network): Account {
  const a = address.trim();
  if (!/^g1[a-z0-9]{20,}$/i.test(a)) throw new Error("invalid_address");
  return { address: a, coins: "", chainId: network.chainId, source: "watch" };
}

export function connectKeplr(): never {
  throw new Error("KEPLR_UNSUPPORTED");
}

export async function doContractCall({
  caller,
  pkgPath,
  func,
  args = [],
  send = "",
  gasWanted = 50_000_000,
  gasFee = 1_000_000,
  memo = "zdex",
}: {
  caller: string;
  pkgPath: string;
  func: string;
  args?: string[];
  send?: string;
  gasWanted?: number;
  gasFee?: number;
  memo?: string;
}): Promise<{ ok: true; hash: string; height: string }> {
  const adena = assertAdena();
  const res = await adena.DoContract({
    messages: [
      {
        type: "/vm.m_call",
        value: {
          caller,
          send: send || "",
          pkg_path: pkgPath,
          func,
          args: (args || []).map(String),
        },
      },
    ],
    gasFee,
    gasWanted,
    memo,
  });
  ok(res);
  const data = res.data || {};
  return { ok: true, hash: data.hash || "", height: String(data.height || "") };
}
