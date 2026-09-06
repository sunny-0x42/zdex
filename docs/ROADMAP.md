# Zdex completion roadmap

Synthesized from `zdex-chief`, `zdex-defi`, `zdex-protocol`, `zdex-security`, `zdex-product`, `zdex-trust`. Not investment advice. No Uniswap clone.

## What it is

A Gno-native DEX: native `ugnot`, `CreatePool` listing, no-stake LP fees, points + epoch protocol-fee share, escrow book. Generation `gno.land/r/zdex/v2`.

## Do not ship yet

Security **BLOCK** addpkg until: canonical GRC20 key on the pool (in progress), `MulDiv` remainder, book dust `pay=1`, missed-epoch pot. Details: `docs/research/security.md`.

## Hooks (Gno, not Uniswap v4)

Cannot store `func()` or flash-account like v4. Design: `/p/zdex/hooks/v1` types + allowlisted `/r/` hook realm + `AfterSwap` observe-only. First hook = **TWAP oracle**. Not this week. See `docs/research/hooks-gno.md`.

## Economics

Keep Uniswap-v2 no-stake LP. Do not copy Pump.fun or ve(3,3). Next: persist unclaimed epoch pot; fee+points on `FillOrder`. See `docs/research/economics.md`.

## Product (English UI)

Token-first picker on Swap; one liquidity surface; hide Exact out until wired; book units or Advanced; mobile 3-tab. See `docs/research/product.md`.

## Public line

Use the footer in `docs/research/trust.md`. Never: APY, guaranteed airdrop, Uniswap-equivalent, audited, mainnet.

## Two weeks

See `docs/WEEK.md`. Item 8 (Sapphire v2 addpkg) still needs an explicit human **yes**.
