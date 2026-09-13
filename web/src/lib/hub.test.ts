import { describe, expect, it } from "vitest";
import {
  ALL_TABS,
  gaugesFor,
  incentivesEnabled,
  isIncentivized,
  isLumpGauge,
  isTimedGauge,
  NAV_TABS,
  parseCapsList,
  parseGaugeList,
  parseGaugeSnapshot,
  parseHubSnapshot,
  parseModules,
  pkgForFunc,
  tabsFor,
} from "./hub";
import { resolvePkgPath } from "./wallets";

describe("hub", () => {
  it("parses HubSnapshot with caps after the third field", () => {
    const h = parseHubSnapshot("1;gno.land/r/zdex;gno.land/r/zdex/v2;swap;lp;create;book;points;quote;feeShare;noStakeLp");
    expect(h?.version).toBe("1");
    expect(h?.pkg).toBe("gno.land/r/zdex");
    expect(h?.nextPkg).toBe("gno.land/r/zdex/v2");
    expect(h?.caps.swap).toBe(true);
    expect(h?.caps.feeShare).toBe(true);
    expect(h?.caps.noStakeLp).toBe(true);
  });

  it("parses modules independently of swap", () => {
    const m = parseModules("swap;gno.land/r/zdex\nbook;gno.land/r/zdex/book/v2\nlp;gno.land/r/zdex");
    expect(m.swap).toBe("gno.land/r/zdex");
    expect(m.book).toBe("gno.land/r/zdex/book/v2");
    expect(pkgForFunc({ pools: [], orders: [], ok: true, pkg: "gno.land/r/zdex", modules: m }, "PlaceBid", "fallback")).toBe(
      "gno.land/r/zdex/book/v2",
    );
    expect(pkgForFunc({ pools: [], orders: [], ok: true, pkg: "gno.land/r/zdex", modules: m }, "SwapExactIn", "fallback")).toBe(
      "gno.land/r/zdex",
    );
  });

  it("hides book tab when cap is off", () => {
    const caps = parseCapsList("swap;lp;create;points;quote");
    expect(tabsFor(caps)).toEqual(["swap", "pools", "liq", "port", "guide"]);
  });

  it("keeps guide in nav and create/stats as routes", () => {
    expect(ALL_TABS).toContain("guide");
    expect(ALL_TABS).toContain("create");
    expect(ALL_TABS).toContain("stats");
    expect(NAV_TABS).toEqual(["swap", "pools", "liq", "book", "port", "guide"]);
    const tabs = tabsFor();
    expect(tabs).toContain("guide");
    expect(tabs).not.toContain("create");
    expect(tabs).not.toContain("stats");
  });

  it("treats incentives cap as optional", () => {
    const without = parseCapsList("swap;lp;create;book;points;quote;feeShare;noStakeLp");
    expect(without.incentives).toBe(false);
    expect(without.swap).toBe(true);
    const withInc = parseCapsList("swap;lp;incentives");
    expect(withInc.incentives).toBe(true);
    expect(incentivesEnabled({ incentivesPkg: "" }, without)).toBe(false);
    expect(incentivesEnabled({ incentivesPkg: "gno.land/r/zdex/incentives/v1" }, without)).toBe(true);
    expect(incentivesEnabled({ incentivesPkg: "" }, withInc)).toBe(true);
  });

  it("routes Fund/Claim/Sync to incentivesPkg and does not steal swap", () => {
    const m = parseModules("swap;gno.land/r/zdex\nbook;gno.land/r/zdex/book/v2");
    const live = { pools: [], orders: [], ok: true, pkg: "gno.land/r/zdex", modules: m };
    const inc = "gno.land/r/zdex/incentives/v1";
    expect(pkgForFunc(live, "Fund", "fallback", inc)).toBe(inc);
    expect(pkgForFunc(live, "Claim", "fallback", inc)).toBe(inc);
    expect(pkgForFunc(live, "Sync", "fallback", inc)).toBe(inc);
    expect(pkgForFunc(live, "SwapExactIn", "fallback", inc)).toBe("gno.land/r/zdex");
    expect(pkgForFunc(live, "AddLiquidity", "fallback", inc)).toBe("gno.land/r/zdex");
    expect(pkgForFunc(live, "ClaimFeeShare", "fallback", inc)).toBe("gno.land/r/zdex");
    expect(pkgForFunc(live, "Fund", "gno.land/r/zdex", "")).toBe("");
    expect(resolvePkgPath("Fund", live, "gno.land/r/zdex", { incentivesPkg: inc })).toBe(inc);
    expect(resolvePkgPath("SwapExactIn", live, "fallback", { incentivesPkg: inc })).toBe("gno.land/r/zdex");
  });

  it("prefers modules.incentives over config incentivesPkg", () => {
    const live = {
      pools: [],
      orders: [],
      ok: true,
      pkg: "gno.land/r/zdex",
      modules: { swap: "gno.land/r/zdex", incentives: "gno.land/r/zdex/incentives/v2" },
    };
    expect(pkgForFunc(live, "Fund", "gno.land/r/zdex", "gno.land/r/zdex/incentives/v1")).toBe(
      "gno.land/r/zdex/incentives/v2",
    );
  });

  it("routes Fund and FundProgram to incentives v3 when live", () => {
    const live = {
      pools: [],
      orders: [],
      ok: true,
      pkg: "gno.land/r/zdex",
      incentivesV2Live: true,
      incentivesV2Pkg: "gno.land/r/zdex/incentives/v2",
      incentivesV3Live: true,
      incentivesV3Pkg: "gno.land/r/zdex/incentives/v3",
      incentivesPkg: "gno.land/r/zdex/incentives/v1",
    };
    expect(pkgForFunc(live, "Fund", "gno.land/r/zdex", live.incentivesPkg)).toBe("gno.land/r/zdex/incentives/v3");
    expect(pkgForFunc(live, "FundProgram", "gno.land/r/zdex", live.incentivesPkg)).toBe(
      "gno.land/r/zdex/incentives/v3",
    );
    expect(pkgForFunc(live, "Claim", "gno.land/r/zdex", live.incentivesPkg)).toBe("gno.land/r/zdex/incentives/v1");
  });

  it("routes Fund to incentives v4 when live", () => {
    const live = {
      pools: [],
      orders: [],
      ok: true,
      pkg: "gno.land/r/zdex",
      incentivesV3Live: true,
      incentivesV3Pkg: "gno.land/r/zdex/incentives/v3",
      incentivesV4Live: true,
      incentivesV4Pkg: "gno.land/r/zdex/incentives/v4",
      incentivesPkg: "gno.land/r/zdex/incentives/v1",
    };
    expect(pkgForFunc(live, "FundProgram", "gno.land/r/zdex", live.incentivesPkg)).toBe(
      "gno.land/r/zdex/incentives/v4",
    );
  });

  it("parses GaugeList and GaugeSnapshot", () => {
    expect(parseGaugeList("ugnot|ZTT\nugnot|DEMO")).toEqual(["ugnot|ZTT", "ugnot|DEMO"]);
    expect(parseGaugeList("ugnot|ZTT;100;5000000;1;0")).toEqual(["ugnot|ZTT"]);
    const g = parseGaugeSnapshot("ugnot|ZTT;12;5000000;1;0");
    expect(g).toEqual({
      id: "ugnot|ZTT",
      acc: "12",
      totalFunded: "5000000",
      on: true,
      paused: false,
      endH: "",
      rewardPerBlock: "0",
      remaining: "",
    });
    const timed = parseGaugeSnapshot("ugnot|ZTT;1;100000000;1;0;250000;3;90000000");
    expect(timed?.rewardPerBlock).toBe("3");
    expect(timed?.remaining).toBe("90000000");
    expect(parseGaugeSnapshot("ugnot|ZTT;0;0;0;1")?.on).toBe(false);
    const one = { pools: [], orders: [], ok: true, gauges: [g!] };
    expect(isIncentivized(one, "ugnot|ZTT")).toBe(true);
    expect(isIncentivized(one, "ugnot|DEMO")).toBe(false);
  });

  it("splits lump vs timed gauges per pool", () => {
    const live = {
      ok: true,
      pools: [],
      orders: [],
      gauges: [
        { id: "ugnot|ZDEX", acc: "1", totalFunded: "100000000", on: true, paused: false, pkg: "gno.land/r/x/incentives/v1" },
        {
          id: "ugnot|ZDEX",
          acc: "0",
          totalFunded: "0",
          on: true,
          paused: false,
          remaining: "0",
          rewardPerBlock: "0",
          pkg: "gno.land/r/x/incentives/v3",
        },
      ],
    };
    expect(gaugesFor(live, "ugnot|ZDEX")).toHaveLength(2);
    expect(isLumpGauge(live.gauges[0])).toBe(true);
    expect(isTimedGauge(live.gauges[0])).toBe(false);
    expect(isTimedGauge(live.gauges[1])).toBe(true);
    expect(isLumpGauge(live.gauges[1])).toBe(false);
  });
});
