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

## Sign it yourself

Do **not** paste a seed or password into chat, files, or CI.

Unlock the key that already lives in *your* gnokey keystore, then:

```
cd C:\Users\Hi\zdex
.\deploy\pearl\addpkg.ps1 -KeyName <YOUR_GNOKEY_NAME>
```

That simulates both packages. When the dry-run looks right:

```
.\deploy\pearl\addpkg.ps1 -KeyName <YOUR_GNOKEY_NAME> -Broadcast
```

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

## After it lands

- AMM: https://pearl.testnets.gno.land/p/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/amm/v1
- Realm: https://pearl.testnets.gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2
- UI: https://zdex-gno.netlify.app (default net `pearl`)

## Why this agent does not broadcast

gnomcp treats `pearl-1` as read-only (no agent key). Raw `gnokey` plus a seed/password
from chat is refused: that material is compromised the moment it is pasted.
