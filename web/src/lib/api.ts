import type { Pool } from "../types";

export function withNet(path: string, netId: string): string {
  const u = new URL(path, window.location.origin);
  u.searchParams.set("net", netId);
  return u.pathname + u.search;
}

export async function api<T = Record<string, unknown>>(path: string, netId: string): Promise<T> {
  const r = await fetch(withNet(path, netId));
  const j = (await r.json()) as T & { error?: string };
  if (j && typeof j === "object" && "error" in j && j.error) throw new Error(String(j.error));
  return j;
}

export function sparkKey(id: string, netId: string): string {
  return `zdex.spark.${netId}.${id}`;
}

export function loadSpark(id: string, netId: string): number[] {
  try {
    const a = JSON.parse(localStorage.getItem(sparkKey(id, netId)) || "[]") as unknown;
    return Array.isArray(a) ? a.map(Number).filter((n) => n > 0) : [];
  } catch {
    return [];
  }
}

export function saveSpark(id: string, netId: string, arr: number[]): void {
  localStorage.setItem(sparkKey(id, netId), JSON.stringify((arr || []).slice(-48)));
}

export function mergeSparks(pools: Pool[] | undefined, netId: string): Pool[] {
  return (pools || []).map((p) => {
    const merged = loadSpark(p.id, netId).concat(p.spark || []);
    const spark: number[] = [];
    for (const v of merged) {
      const n = Number(v);
      if (n > 0 && spark[spark.length - 1] !== n) spark.push(n);
    }
    const next = spark.slice(-48);
    saveSpark(p.id, netId, next);
    return { ...p, spark: next };
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
