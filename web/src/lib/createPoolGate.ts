/** Split Approve vs Create so external GRC20 can Approve before createReady. */
export function createPoolGates(opts: {
  resolved: { internal?: boolean } | null;
  gnotUgnot: bigint;
  tokenBase: bigint;
  canSign: boolean;
  tokPkg: string;
  realmAddr: string;
  approved: boolean;
}): { approveReady: boolean; createReady: boolean } {
  const amounts = Boolean(opts.resolved && opts.gnotUgnot >= 1_000_000n && opts.tokenBase > 0n && opts.canSign);
  const ext = Boolean(opts.resolved && !opts.resolved.internal);
  const pkgOk = Boolean(opts.tokPkg && opts.realmAddr);
  return {
    approveReady: amounts && ext && pkgOk,
    createReady: amounts && (!ext || (pkgOk && opts.approved)),
  };
}
