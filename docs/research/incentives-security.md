# Recheck: sidecar `gno.land/r/zdex/incentives/v1` (local)

## Verdict

**SHIP** (security) cho source `gno.land/r/zdex/incentives/v1`.

Sáu ship-blocker của design review trước đã vá trên file. `gno test ./gno.land/r/zdex/incentives/v1` xanh (`ok`, ~1.2s), gồm `TestClaimAfterRemoveForfeits`. Không phải clearance on-chain. Addpkg vẫn cần human **yes**. Không broadcast.

## Provenance

- Subject: workspace `C:\Users\Hi\zdex\gno.land\r\zdex\incentives\v1` (không đọc Pearl / Sapphire — path chưa deploy).
- Đã đọc full: `incentives.gno`, `state.gno`, `query.gno`, `render.gno`, `incentives_test.gno`, `gnomod.toml`. Primitive v2: `PoolInfo` / `PositionOf` / `takeUgnot` / `sendUgnot`.
- Method: `gno-audit` Phase 1+2+3, FP filter. Class số từ `security.md` gno-mcp. Không PoC.
- Design review cũ (BLOCK, chưa có source) được thay bởi recheck này.

## Confidence

First-pass trên source: 11 ứng viên. After FP filter: 0 BLOCK; 5 remaining (Medium/Low/Info). Catalog payment-guard và ghost-LP đều có test.

---

## Blocker đóng (không lặp lại)

| Cũ | Vá | Evidence |
|---|---|---|
| Critical `OriginSend` mismatch / extra denom | `IsUserCall` trước envelope; `len(os)==1` && denom `ugnot`; `sent >= 1 GNOT` | `incentives.gno:15-20` |
| Critical non-EOA `Fund` (Acc inflation) | `IsUserCall`; test `NewCodeRealm` | `incentives.gno:15`, `incentives_test.gno:126-135` |
| High `TotalLP==0` / unknown pool | `PoolInfo` rồi `totalLP > 1000`; unknown panic v2 | `incentives.gno:21-22`, `incentives_test.gno:115-124` |
| High overflow Acc | `amm.MulDiv` + `add64`; `delta > 0` | `incentives.gno:25-28`, `state.gno:56-61` |
| Critical Claim after `RemoveLiquidity` | `pendingOf` = `min(LastLP, PositionOf live)` | `incentives.gno:44-52`, `incentives_test.gno:169-192` |
| High spoofed `poolID` | `PoolInfo` trước mutate; `g.On`; không param `owner` trên Fund/Claim | `incentives.gno:21-24`, `incentives.gno:57-76` |
| Claim từ v2 banker | `BankerTypeRealmSend` + `IsCurrent` trên **this** realm | `incentives.gno:92-98` |
| Pause chặn Claim | `Fund` check `paused`; `Sync`/`Claim` không | `incentives.gno:16`, `incentives.gno:55-76` |

---

## Trace (entrypoints)

### `Fund` — payment-guard + Acc

```14:29:gno.land/r/zdex/incentives/v1/incentives.gno
func Fund(cur realm, poolID string) {
	require(cur.Previous().IsUserCall(), "zdex: ugnot is EOA-only")
	require(!paused, "zdex: paused")
	os := unsafe.OriginSend()
	require(len(os) == 1 && os[0].Denom == nativeDenom, "zdex: only ugnot")
	sent := os.AmountOf(nativeDenom)
	require(sent >= minFundUgnot, "zdex: min 1 GNOT")
	_, _, _, totalLP, _ := zdex.PoolInfo(poolID)
	require(totalLP > minLiquidity, "zdex: empty pool")
	g := ensureGauge(poolID, true)
	require(g.On, "zdex: gauge off")
	delta := amm.MulDiv(sent, scale, totalLP)
	require(delta > 0, "zdex: dust fund")
	g.Acc = add64(g.Acc, delta)
	g.TotalFunded = add64(g.TotalFunded, sent)
```

Thứ tự khớp canonical: `IsUserCall` → đọc `OriginSend` → query v2 → mutate Acc. Không `IsUser()`. Không `amount` param (tránh mismatch). Index **B**: `den = TotalLP` v2, dust = minLiquidity + LP chưa `Sync`.

### `pendingOf` / `Claim` — solvent haircut

```32:76:gno.land/r/zdex/incentives/v1/incentives.gno
func pendingOf(poolID string, owner address) int64 {
	// ...
	live := zdex.PositionOf(poolID, owner)
	eligible := st.LastLP
	if live < eligible {
		eligible = live
	}
	if eligible <= 0 {
		return 0
	}
	return amm.MulDiv(eligible, acc-st.LastAcc, scale)
}

func Sync(cur realm, poolID string) int64 {
	caller := cur.Previous().Address()
	earned := pendingOf(poolID, caller)
	st := getOrCreateStake(poolID, caller)
	// ...
	st.LastLP = zdex.PositionOf(poolID, caller)
	st.LastAcc = acc
	if earned > 0 {
		sendUgnot(0, cur, caller, earned)
	}
```

`Claim` = `Sync`. Snapshot `LastLP`/`LastAcc` **trước** `SendCoins` (CEI; panic send revert cả tx). First `Sync` (`LastLP==0`) earned = 0 — join semantics. `RemoveLiquidity` rồi Fund rồi Claim = 0 (`TestClaimAfterRemoveForfeits`).

```92:98:gno.land/r/zdex/incentives/v1/incentives.gno
func sendUgnot(_ int, rlm realm, to address, amount int64) {
	if !rlm.IsCurrent() {
		panic("zdex: spoofed realm")
	}
	bk := banker.NewBanker(banker.BankerTypeRealmSend, rlm)
	bk.SendCoins(rlm.Address(), to, chain.Coins{{Denom: nativeDenom, Amount: amount}})
}
```

Không `cross(cur)` mutator v2. Chỉ `PoolInfo` / `PositionOf` (không `cur`) — Class 1a/1b không có.

### Admin

`SetGauge` / `SetPaused` = `mustOwner(cur)`. `SetGauge` không ghi `Acc`, không `func()`. `ensureGauge` Fund-path `onIfNew=true` (permissionless gift). Gauge off chặn Fund, không chặn Claim.

---

## Remaining (không BLOCK addpkg sidecar)

### Medium

**Launch / seed LP không Position — Fund vẫn vào.** `totalLP > 1000` true trên Launch burn (`launch.gno:50-52`) dù `PositionOf` mọi EOA = 0. `TestFundIncreasesAcc` Fund ngay sau Launch → Acc tăng, **100% kẹt** (join sau snapshot `LastAcc = Acc`). Option B dust; funder grief, không overpay. UI: đừng Fund pool chưa có live LP. Optional: `require(zdex.PositionOf != 0)` không làm được (không iterate); admin `SetGauge(id, false)` cho Launch lock.

**Không `SweepDust`.** Share `minLiquidity/TotalLP` + LP chưa checkpoint + floor `MulDiv` nằm banker vĩnh viễn. Catalog “no withdraw” không áp toàn bộ (Claim là lối ra user). Dust không gán ai. Trước mainnet: `SweepDust` admin + paused.

**Admin một bước.** `init` gán deployer (`state.gno:40-42`); không `ProposeAdmin`/`AcceptAdmin` (v2 có `admin.gno:11-25`). Mất key = mất Pause/SetGauge. Fund permissionless vẫn chạy trừ khi paused. Copy two-step trước mainnet.

**v2 pause ≠ incentives pause.** Isolation đúng. Emergency LP ảo: admin pause **cả hai**. Claim incentives khi v2 paused vẫn đi theo `PositionOf`.

### Low

**`SetGauge` không gọi `PoolInfo`.** Admin tạo gauge orphan; `Fund` sau vẫn panic `pool not found` (revert, không mất coin).

**Không test `IsUserRun` / extra-denom / conservation / Claim-when-paused.** Code đã chặn (`IsUserCall`, `len==1`). Coverage, không lệch guard. `TestPauseAndGaugeOff` Claim sau gauge off (earned 0), không Claim lúc `paused==true` với pending > 0.

**`add64` Acc DoS Fund** khi Acc → MaxInt64. Claim vẫn được (Acc đóng băng). Cùng class `AccPoints` v2.

### Info

- `render.gno:34` viết `totalLP > 0`; code là `> minLiquidity` (1000).
- `Render` sanitize `g.ID` (`render.gno:27`); không echo raw `path`.
- Hub v2 `Modules` không có `incentives` — UI trỏ pkg path riêng.
- Sidecar **opt-in** farm; đừng copy “no stake” của LP fee v2.

---

## GREEN giữ

| Mặt | File |
|---|---|
| EOA-only `Fund`, envelope = receipt | `incentives.gno:15-20` |
| Query v2 không `cur`, không persist `*zdex.Pool` | `incentives.gno:21`, `:44`, `:65` |
| Haircut live LP — không ghost | `incentives.gno:44-48` |
| Claim banker this realm + `IsCurrent` | `incentives.gno:92-98` |
| Pause không chặn Claim | `incentives.gno:16` vs `:74-76` |
| Không GRC20 / vest / snipe / `func()` hook | surface |

Không lấy được `ReserveU`, book escrow, `epochPot` v2.

---

## Checklist (cập nhật)

### Payment / banker — done

- [x] `Fund`: `IsUserCall` trước `OriginSend`; không `IsUser()` (`incentives.gno:15-17`)
- [x] Không `amount` param; Acc dùng `sent`; min 1 GNOT (`:19-20`)
- [x] Extra denom → panic (`:18`)
- [x] Test `NewCodeRealm` (`incentives_test.gno:126-135`)
- [x] Claim `BankerTypeRealmSend` + `IsCurrent` (`incentives.gno:92-98`)

### Acc / Stake / Claim — done (option B)

- [x] `MulDiv` = `gno.land/p/zdex/amm/v1`
- [x] `Acc = add64(Acc, delta)`; `totalLP > 1000`; `delta > 0`
- [x] Index **B** `TotalLP` + dust documented (comment `Sync`)
- [x] `share = min(LastLP, PositionOf)`; CEI snapshot rồi send
- [x] First Sync earned 0 (`LastLP<=0`)
- [x] Test Remove → Fund → Claim = 0 (`incentives_test.gno:169-192`)
- [x] Unknown pool panic (`:115-124`)

### Surface — done / residual

- [x] Không `owner` identity trên Fund/Claim (query `Claimable` là read)
- [x] Không `func()` trên `SetGauge`
- [x] Không `cross(cur)` mutator v2
- [x] Pause riêng; Claim khi pause
- [x] Types trong package; AVL unexported; Render sanitize id
- [ ] Two-step admin (Medium, mainnet)
- [ ] `SweepDust` (Medium, mainnet)
- [ ] Test conservation `claim <= funded - dust` (Low)

---

## Open

- Banker invariant v2 không cover module này. Incentives: `banker >= TotalFunded - claimed` (dust ở lại).
- `Fund` có check `zdex.Paused()` không — product.
- Indexer: pkg path riêng, không `SetModule`.

## Cross-references

- `docs/research/security.md`, `security-recheck.md` — v2.
- `docs/research/hooks-gno.md` — sidecar observe-only.
- `docs/research/economics.md` — không ve(3,3); gauge = donated ugnot.

## Không làm

Không exploit payload. Không mnemonic. Không raw gnokey. Không addpkg / broadcast. Không sửa `gnomemepad`.
