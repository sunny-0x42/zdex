import { describe, expect, it } from "vitest";
import { parseCapsList, parseHubSnapshot, parseModules, pkgForFunc, tabsFor } from "./hub";

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
    expect(tabsFor(caps)).toEqual(["swap", "pools", "liq", "port", "stats"]);
  });
});
