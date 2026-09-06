interface AdenaResponse {
  code?: number;
  status?: string;
  type?: string;
  message?: string;
  data?: {
    address?: string;
    coins?: string;
    chainId?: string;
    hash?: string;
    height?: string;
  };
}

interface Adena {
  AddEstablish(name: string): Promise<AdenaResponse>;
  AddNetwork(n: { chainId: string; chainName: string; rpcUrl: string }): Promise<AdenaResponse>;
  SwitchNetwork(chainId: string): Promise<AdenaResponse>;
  GetAccount(): Promise<AdenaResponse>;
  DoContract(tx: {
    messages: Array<{ type: string; value: Record<string, unknown> }>;
    gasFee: number;
    gasWanted: number;
    memo: string;
  }): Promise<AdenaResponse>;
}

export {};

interface ImportMetaEnv {
  readonly VITE_ZDEX_DEFAULT_NET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    adena?: Adena;
    keplr?: { getKey?(chainId: string): Promise<unknown> };
  }
}

declare module "../config.js" {
  export const NETWORKS: Record<string, import("./types").Network>;
  export const DEFAULT_NET: string;
  export const NETWORK: import("./types").Network;
  export const PKG_PATH: string;
  export const DEPLOYER: string;
}
declare module "../../config.js" {
  export const NETWORKS: Record<string, import("./types").Network>;
  export const DEFAULT_NET: string;
  export const NETWORK: import("./types").Network;
  export const PKG_PATH: string;
  export const DEPLOYER: string;
}
