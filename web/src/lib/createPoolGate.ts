/** Split Approve vs Create so external GRC20 can Approve before createReady. */
export function createPoolGates(opts: {
  resolved: { internal?: boolean; pooled?: boolean; decimals?: number } | null;
  gnotUgnot: bigint;
  tokenBase: bigint;
  canSign: boolean;
  tokPkg: string;
  realmAddr: string;
  approved: boolean;
}): { approveReady: boolean; createReady: boolean; addExisting: boolean } {
  const pooled = Boolean(opts.resolved?.pooled);
  const amounts = Boolean(opts.resolved && opts.gnotUgnot >= 1_000_000n && opts.tokenBase > 0n && opts.canSign);
  const ext = Boolean(opts.resolved && !opts.resolved.internal);
  const pkgOk = Boolean(opts.tokPkg && opts.realmAddr);
  const decimalsOk = Boolean(opts.resolved?.internal || (opts.resolved?.decimals && opts.resolved.decimals > 0));
  return {
    approveReady: amounts && ext && pkgOk && !pooled,
    createReady: amounts && decimalsOk && !pooled && (!ext || (pkgOk && opts.approved)),
    addExisting: Boolean(opts.resolved && pooled),
  };
}
