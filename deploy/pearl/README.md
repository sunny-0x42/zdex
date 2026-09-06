# Pearl addpkg packet (generation v2)

Signer address (public): `g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr`

This tree is rewritten for Pearl namespace rules. Local source stays on
`gno.land/p/zdex/amm/v1` and `gno.land/r/zdex/v2`.

## Live checks (2026-09-06)

| | |
|---|---|
| chain-id | `pearl-1` |
| RPC | `https://rpc.pearl.testnets.gno.land:443` |
| gnoweb | `https://pearl.testnets.gno.land` |
| faucet | `https://pearl.testnets.gno.land/faucet` |
| account | funded, sequence 26 |
| CLA | enforcement disabled (and this address already has a valid signature) |
| `IsAuthorizedAddressForNamespace(addr, "zdex")` | **false** — cannot addpkg `gno.land/p/zdex/...` |
| zdex under this g1 | **not deployed yet** |

## Paths

1. AMM `/p/` first: `gno.land/p/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/amm/v1`
2. Realm: `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`

`r-v2/math.gno` already imports the AMM path above.

## Pearl GRC20 (do not copy local token.gno blindly)

Pearl `gno.land/p/demo/tokens/grc20` hangs `CallerTeller()` on `*PrivateLedger`, not `*Token`.
Pearl `grc20reg.Transfer` / `TransferFrom` are **non-crossing**:

```
grc20reg.TransferFrom(0, rlm, key, from, to, amt)
grc20reg.Transfer(0, rlm, key, to, amt)
```

`cross(rlm)` here would debit the registry. Local GNOROOT still has the older Token.CallerTeller API — keep that in `gno.land/r/zdex/v2`. Only `deploy/pearl/r-v2/token.gno` is Pearl-shaped.

## Sign it yourself

Do **not** paste a seed or password into chat, files, or CI.

Key name for `g1mv0052…` on this machine is `deploykey`. AMM must be **on-chain** before the realm typechecks.

```
cd C:\Users\Hi\zdex
.\deploy\pearl\addpkg.ps1 -KeyName deploykey -Stage Amm
.\deploy\pearl\addpkg.ps1 -KeyName deploykey -Stage Amm -Broadcast
.\deploy\pearl\addpkg.ps1 -KeyName deploykey -Stage Realm
.\deploy\pearl\addpkg.ps1 -KeyName deploykey -Stage Realm -Broadcast
.\deploy\pearl\addpkg.ps1 -KeyName deploykey -Stage Incentives
.\deploy\pearl\addpkg.ps1 -KeyName deploykey -Stage Incentives -Broadcast
```

Do **not** `SetNextPkg` to the incentives sidecar. NextPkg is the DEX hub successor only.

Equivalent commands (replace `KEYNAME`):

```
gnokey maketx addpkg ^
  -pkgpath "gno.land/p/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/amm/v1" ^
  -pkgdir "C:\Users\Hi\zdex\deploy\pearl\p-amm-v1" ^
  -gas-fee 160000ugnot ^
  -gas-wanted 80000000 ^
  -max-deposit 20000000ugnot ^
  -chainid pearl-1 ^
  -remote "https://rpc.pearl.testnets.gno.land:443" ^
  -simulate only ^
  KEYNAME
```

Then the same for `-pkgpath "gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2"` and
`-pkgdir "C:\Users\Hi\zdex\deploy\pearl\r-v2"`. Swap `-simulate only` for `-broadcast` when ready.

## List ZDEX (300 GNOT)

Creates GRC20 `ZDEX` (6 decimals, 1,000,000 minted to the deployer), Approves zdex v2, then `CreatePool` with **300 GNOT + 300,000 ZDEX** (fee 30 bps). Pool id `ugnot|ZDEX`.

Wallet currently needs ≥ ~310 GNOT (300 deposit + gas/storage). Do not `SetNextPkg`.

```
cd C:\Users\Hi\zdex
.\deploy\pearl\list-zdex.ps1 -KeyName deploykey -Stage Token
.\deploy\pearl\list-zdex.ps1 -KeyName deploykey -Stage Token -Broadcast
.\deploy\pearl\list-zdex.ps1 -KeyName deploykey -Stage Approve -Broadcast
.\deploy\pearl\list-zdex.ps1 -KeyName deploykey -Stage Pool -Broadcast
```

## After it lands

- AMM: https://pearl.testnets.gno.land/p/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/amm/v1
- Realm: https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2
- UI: https://zdex-gno.netlify.app (default net `pearl`)

## Why this agent does not broadcast

gnomcp treats `pearl-1` as read-only (no agent key). Raw `gnokey` plus a seed/password
from chat is refused: that material is compromised the moment it is pasted.
