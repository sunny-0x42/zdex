import { describe, expect, it } from "vitest";
import { copy, errText } from "./i18n";

describe("copy", () => {
  it("is English", () => {
    expect(copy.tab.swap).toBe("Trade");
    expect(copy.connect).toBe("Connect");
    expect(copy.noWallet).toMatch(/wallet/i);
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
});
