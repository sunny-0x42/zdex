# Zdex

Fully on-chain Gno.land DEX. Repo root for all company work.

Write to the user in Vietnamese. Keep chain nouns in English.

Load skill `zdex-company`. Roster is **`zdex-*` only** (never `gnomi-*` or `gvs-*` on this repo).

## Roster

| Agent | Owns |
|---|---|
| `zdex-chief` | Intake, week list, human-yes gates |
| `zdex-protocol` | Realms `r/zdex`, `r/zdex/v2`, `/p/zdex/*` |
| `zdex-security` | Overflow, OriginSend, escrow, hooks, allowances |
| `zdex-defi` | CPMM, fees, points, fee-share, book vs AMM |
| `zdex-product` | `web/` English UI, Adena, LP token picker |
| `zdex-growth` | DEX copy drafts only |
| `zdex-devops` | gnodev, RPC, `web/server.mjs`, deploy trees |
| `zdex-trust` | Public claims, no-advice |
| `zdex-research` | Hooks, competitors, feasibility notes |

## Frozen

Do not edit `C:\Users\Hi\gnomemepad` (Gnomi Labs) or `C:\Users\Hi\gno-vault-strategy`.

## Facts

- Native `ugnot` via `OriginSend` (no wugnot).
- `MulDiv` overflow-safe. Listing is `CreatePool` (DEX-only). `Launch` is legacy.
- Swap fee tiers 5 / 30 / 100 bps. Protocol ~1/6 of the fee; LPs ~5/6. No extra stake for LP fees.
- Points: volume + LP AccPoints. 80% of protocol ugnot fees → epoch pot.
- Escrow limit orders. Internal mint in-realm; external GRC20 Approve + TransferFrom.
- Upgrade: immutable packages. Hub `Version` / `Caps` / `NextPkg` / `Modules`. Live generation: `gno.land/r/zdex/v2`.
- Pure math: `gno.land/p/zdex/amm/v1`.
- Pool id: `ugnot|<SYMBOL>`.
- Tests: `gno test ./gno.land/r/zdex/` and `gno test ./gno.land/r/zdex/v2`. UI: `cd web; npm test`.
- UI: `web/` — `node server.mjs` → http://127.0.0.1:8787 (English).
- Sapphire v1: `gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex`
- Merge, addpkg, tweets: explicit human yes. No mnemonics. No raw gnokey.
