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
    viewAddr: "",
  },
  pearl: {
    id: "pearl",
    chainId: "pearl-1",
    chainName: "Gno Pearl",
    rpcUrl: "https://rpc.pearl.testnets.gno.land:443",
    gnoweb: "https://pearl.testnets.gno.land",
    faucet: "https://pearl.testnets.gno.land/faucet",
    pkg: "",
    viewAddr: "",
  },
};

export const DEFAULT_NET = "local";
export const NETWORK = NETWORKS[DEFAULT_NET];
export const PKG_PATH = NETWORK.pkg;
export const DEPLOYER = "g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k";
export const GRC20_REG = "gno.land/r/demo/defi/grc20reg";
