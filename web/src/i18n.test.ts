import { describe, expect, it } from "vitest";
import { copy, errText } from "./i18n";

describe("copy", () => {
  it("is English", () => {
    expect(copy.tab.swap).toBe("Trade");
    expect(copy.connect).toBe("Connect");
    expect(copy.noWallet).toMatch(/wallet/i);
    expect(copy.tab.guide).toBe("Guide");
    expect(copy.pageSub.guide).toMatch(/how zdex works/i);
  });
  it("maps error codes", () => {
    expect(errText(copy, "snipe_cap")).toMatch(/snipe/i);
    expect(errText(copy, "paused")).toMatch(/paused/i);
  });
  it("describes extra ugnot gauge without APY promises", () => {
    expect(copy.incentivized).toBe("Incentivized");
    expect(copy.gaugeHint).toMatch(/extra ugnot/i);
    expect(copy.gaugeHint).toMatch(/does not replace LP swap fees/i);
    expect(copy.gaugeHint).toMatch(/not financial advice/i);
    expect(copy.gaugeHint).not.toMatch(/APY/i);
    expect(copy.fundGauge).not.toMatch(/APY/i);
    expect(copy.claimIncentive).not.toMatch(/APY/i);
  });
  it("documents DEX facts without Launch or yield promises", () => {
    const g = Object.values(copy.guide).join(" ");
    expect(g).toMatch(/Approve/);
    expect(g).toMatch(/Minimum 1 GNOT/);
    expect(g).toMatch(/Fund min 1 GNOT on the incentives package/);
    expect(g).toMatch(/Claim after Sync/);
    expect(g).toMatch(/forfeit/i);
    expect(g).toMatch(/OriginSend/);
    expect(g).toMatch(/CreatePool/);
    expect(g).toMatch(/gno\.land\/r\/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr\/zdex\/v2/);
    expect(g).toMatch(/incentives\/v1/);
    expect(g).not.toMatch(/APY/i);
    expect(g).not.toMatch(/\bLaunch\b/);
    expect(copy.nfaPearl).toBe("Not financial advice. Pearl is a testnet.");
    expect(copy.guide.banner).toMatch(/testnet/i);
    expect(copy.guide.banner).toMatch(/no value/i);
    expect(copy.guide.banner).toMatch(/not financial advice/i);
    expect(copy.pageSub.pools).not.toMatch(/APR/i);
  });
});
