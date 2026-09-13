import { describe, expect, it } from "vitest";
import { createPoolGates } from "./createPoolGate";

const base = {
  gnotUgnot: 1_000_000n,
  tokenBase: 1000n,
  canSign: true,
  tokPkg: "gno.land/r/demo/token",
  realmAddr: "g1realm",
};

describe("createPoolGates", () => {
  it("lets Approve run before Create on external GRC20", () => {
    const g = createPoolGates({ ...base, resolved: { internal: false, decimals: 6 }, approved: false });
    expect(g.approveReady).toBe(true);
    expect(g.createReady).toBe(false);
  });
  it("enables Create after Approve", () => {
    const g = createPoolGates({ ...base, resolved: { internal: false, decimals: 6 }, approved: true });
    expect(g.approveReady).toBe(true);
    expect(g.createReady).toBe(true);
  });
  it("skips Approve for internal tokens", () => {
    const g = createPoolGates({ ...base, resolved: { internal: true, decimals: 6 }, tokPkg: "", realmAddr: "", approved: false });
    expect(g.approveReady).toBe(false);
    expect(g.createReady).toBe(true);
  });
  it("blocks Approve until realmAddr and token pkg exist", () => {
    const g = createPoolGates({ ...base, resolved: { internal: false, decimals: 6 }, realmAddr: "", approved: false });
    expect(g.approveReady).toBe(false);
    expect(g.createReady).toBe(false);
  });
  it("blocks Create when decimals are missing", () => {
    const g = createPoolGates({ ...base, resolved: { internal: false, decimals: 0 }, approved: true });
    expect(g.createReady).toBe(false);
  });
  it("routes a pooled lookup to Add LP", () => {
    const g = createPoolGates({ ...base, resolved: { internal: false, pooled: true, decimals: 6 }, approved: false });
    expect(g.addExisting).toBe(true);
    expect(g.createReady).toBe(false);
    expect(g.approveReady).toBe(false);
  });
});
