// pkg is the live generation. hubPkg is v1 (immutable LP). UI reads
// Version/Caps/Modules/NextPkg so a later /v3 can switch without rewriting
// swap or LP. Override with localStorage zdex.pkg.<netId> or ?pkg=.
export const NETWORKS = {
  local: {
    id: "local",
    chainId: "dev",
    chainName: "gnodev local",
    rpcUrl: "http://127.0.0.1:26657",
    gnoweb: "http://127.0.0.1:8888",
    faucet: "",
    pkg: "gno.land/r/zdex/v2",
    hubPkg: "gno.land/r/zdex",
    incentivesPkg: "gno.land/r/zdex/incentives/v1",
    incentivesV2Pkg: "gno.land/r/zdex/incentives/v2",
    viewAddr: "g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5",
  },
  sapphire: {
    id: "sapphire",
    chainId: "sapphire-1",
    chainName: "Gno Sapphire",
    rpcUrl: "https://rpc.sapphire.testnets.gno.land:443",
    gnoweb: "https://sapphire.testnets.gno.land",
    faucet: "https://sapphire.testnets.gno.land/faucet",
    pkg: "gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex",
    incentivesPkg: "",
    viewAddr: "",
  },
  pearl: {
    id: "pearl",
    chainId: "pearl-1",
    chainName: "Gno Pearl",
    rpcUrl: "https://rpc.pearl.testnets.gno.land:443",
    gnoweb: "https://pearl.testnets.gno.land",
    faucet: "https://pearl.testnets.gno.land/faucet",
    pkg: "gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2",
    incentivesPkg: "gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1",
    incentivesV2Pkg: "gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v2",
    viewAddr: "g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr",
  },
};

function defaultNet() {
  let raw = "";
  try {
    if (typeof process !== "undefined" && process.env) {
      raw = process.env.ZDEX_DEFAULT_NET || process.env.VITE_ZDEX_DEFAULT_NET || "";
    }
  } catch {
    /* ignore */
  }
  try {
    if (!raw && typeof import.meta !== "undefined" && import.meta.env) {
      raw = import.meta.env.VITE_ZDEX_DEFAULT_NET || "";
    }
  } catch {
    /* ignore */
  }
  const id = String(raw || "local").toLowerCase();
  return NETWORKS[id] ? id : "local";
}

export const DEFAULT_NET = defaultNet();
export const NETWORK = NETWORKS[DEFAULT_NET];
export const PKG_PATH = NETWORK.pkg;
export const DEPLOYER = "g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr";
export const GRC20_REG = "gno.land/r/demo/defi/grc20reg";
