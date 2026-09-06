# Zdex company

Separate from Gnomi Labs (`gnomi.fun`) and Gno Vault.

Repo: `C:\Users\Hi\zdex`. Product: DEX-only on Gno.land (not a launchpad).

## Roster

Call these agents by name. Do not mix `gnomi-*` or `gvs-*` into this repo.

| Seat | Agent | Writes code? |
|---|---|---|
| Chief of Staff | `zdex-chief` | No |
| Protocol | `zdex-protocol` | Realm / `/p/` |
| Security | `zdex-security` | Fixes after audit |
| DeFi | `zdex-defi` | Fee/points math |
| Product | `zdex-product` | `web/` |
| Growth | `zdex-growth` | Copy drafts |
| DevOps | `zdex-devops` | gnodev / CI / deploy trees |
| Trust | `zdex-trust` | Public wording |
| Research | `zdex-research` | `docs/` only unless asked to ship |

## Gates

Human yes required: merge, addpkg, production, tweets, fund movement.

Never: mnemonics, raw `gnokey`, exploit payloads, editing `gnomemepad`.

## How to run a week

1. `zdex-chief` names one outcome per lane.
2. Specialists work in parallel when independent.
3. `gno test` + `cd web && npm test` before asking for deploy yes.
4. Stop. Report residual risk.

Slash: `/zdex-company`, `/zdex-loop`, `/workflow zdex-develop`.
