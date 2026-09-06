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
});
