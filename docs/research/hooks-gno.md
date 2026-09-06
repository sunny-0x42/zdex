# Hooks trên Gno — Zdex v1

Status: research / design. Không deploy. Không addpkg. Không đổi ABI live
`SwapExactIn` / `AddLiquidity` trên `gno.land/r/zdex` hay `gno.land/r/zdex/v2`.

Tài liệu này đối chiếu Uniswap v4 hooks với constraint Gno (`cur realm`,
`cross(cur)`, `/p/` vs `/r/`, Class 1–4, OriginSend) rồi đề xuất bề mặt tối
thiểu Zdex có thể gắn sau này mà không clone EVM.

Nguồn Zdex: `gno.land/r/zdex/v2/swap.gno`, `pool.gno`, `types.gno`,
`upgrade.gno`, `token.gno`, `math.gno`; math thuần `gno.land/p/zdex/amm/v1`.
Nguồn Gno: `gno` skill `references/security.md`, `interrealm.md`, `patterns.md`.

---

## 1. Kết luận ngắn

Uniswap v4 hooks **không port 1:1**. Trên Gno:

- Không lưu `func()` / bound method / open interface trong realm state
  (Class 4 closed-over-authority, Class 3 impl-substitution).
- Không khai interface method nhận `cur realm` (Class 1a/1b cur-disclosure).
- Không có dynamic import theo string pkg path lúc runtime. `HookPkg` trên
  pool là **key vào allowlist compile-time**, không phải `address.call`.
- Không có EIP-1153 transient storage, không có flash accounting, không có
  banker pull native. OriginSend là envelope EOA một lần.

Bề mặt v1 an toàn: **observe-only AfterSwap**, dispatch tĩnh qua
`cross(cur)` tới `/r/` hook realm đã allowlist. Hook đầu tiên: **TWAP
oracle**. Protocol fee override và LP tax để generation sau.

`SwapExactIn(cur, poolID, tokenIn, amountIn, minOut, maxHeight)` và
`AddLiquidity(cur, poolID, amountU, maxToken, minLP)` **giữ nguyên chữ
ký**. Pool không hook thì zero extra gas path (string rỗng → skip).

---

## 2. Uniswap v4 — lifecycle thật

Pool v4 mang hook trong `PoolKey`. Một pool một hook; hook gắn lúc
`initialize`, không thay sau. PoolManager gọi hook khi bit thấp của
**địa chỉ hook** (CREATE2-mined) bật flag tương ứng.

### 2.1 Callback

| Thời điểm | Tên | Vai trò |
|---|---|---|
| Init | `beforeInitialize` / `afterInitialize` | Validate / ghi state một lần |
| LP | `beforeAddLiquidity` / `afterAddLiquidity` | Gate / penalize JIT |
| LP | `beforeRemoveLiquidity` / `afterRemoveLiquidity` | Lock, tax, fee harvest |
| Swap | `beforeSwap` / `afterSwap` | Dynamic fee, oracle, custom curve |
| Donate | `beforeDonate` / `afterDonate` | Gift vào in-range LP |

Return-delta flags (không nằm trong “10 lifecycle” cổ điển):

- `beforeSwapReturnDelta` / `afterSwapReturnDelta`
- `afterAddLiquidityReturnDelta` / `afterRemoveLiquidityReturnDelta`

`beforeSwap` có thể trả `(selector, BeforeSwapDelta, lpFeeOverride)`.
Delta đủ lớn → **AsyncSwap / NoOp**: PoolManager không chạy curve, hook
tự làm market. Đây là custom AMM trá hình.

### 2.2 Flash accounting + unlock

Mọi thao tác đi qua `PoolManager.unlock` → `IUnlockCallback.unlockCallback`
→ `swap` / `modifyLiquidity` / `donate`. Deltas sống trong **transient
storage**. Cuối session `NonzeroDeltaCount == 0` nếu không thì revert.

Hệ quả bảo mật (Trail of Bits, Cork ~$12M, Bunni $8.4M):

1. Callback là `external` — thiếu `onlyPoolManager` thì ai cũng gọi.
2. Settlement chỉ bảo toàn **conservation**, không bảo toàn **correctness**.
3. Hook panic trong `afterRemoveLiquidity` khóa lối thoát LP.
4. Address bits ≠ code (proxy upgrade, flag mismatch).
5. `hookData bytes` là blob user → hook, bề mặt phishing / extra auth.

v4 **cố ý** cho hook lấy value. Zdex v1 **cố ý không**.

---

## 3. Constraint Gno — không đàm phán

### 3.1 `/p/` vs `/r/`

| | `/p/zdex/hooks/v1` | `/r/zdex/hooks/...` |
|---|---|---|
| State | post-init frozen | persistent |
| Crossing `func F(cur realm, ...)` | không | có |
| Import `/r/` | **cấm** | được |
| Việc đúng | types, Caps, note, math | runtime, allowlist, TWAP ring |

`/p/` không thể gọi hook realm. Interface trong `/p/` là **tài liệu hình
dạng note**, không phải vtable lưu trên `Pool`.

### 3.2 Crossing + `cross(cur)`

MsgCall chỉ vào crossing function. Cross-realm:

```go
twap.AfterSwap(cross(cur), note)   // boundary, finalizes
```

Forward `cur` (không `cross(cur)`) vào code lạ = Class 1a/1b.

Interface **không** được khai `cur realm`. Hook realm export crossing
function riêng; DEX/router gọi theo import tĩnh. Hai chữ ký khác nhau là
đúng, không phải thiếu sót.

### 3.3 Cấm callback caller-supplied

`security.md` (C) + Class 4:

```go
// CẤM — launder m.Realm của DEX
func ApplyHook(fn func(any)) { fn(internalState) }

// CẤM — persist callback
var onSwap func(poolID string, amount int64)

// CẤM — Pool.Hooks IHooks stored; Class 3, readonly taint, seal bypass
```

`realm` value không persist (`cannot persist realm value`). Nhớ caller =
`Address()` / `PkgPath()` string.

### 3.4 OriginSend + banker push-only

`SwapExactIn` buy-side (`swap.gno`):

- `cur.Previous().IsUserCall()` — không `IsUser()` (MsgRun nuốt envelope).
- `unsafe.OriginSend().AmountOf("ugnot") == amountIn`.
- `sendUgnot` / `banker.BankerTypeRealmSend` chỉ **push từ realm**.

Hook **không** được `OriginSend`. Không pull thêm ugnot sau `takeUgnot`.
Không “flash” native. Internal GRC20 mint in-realm; external vẫn Approve +
TransferFrom qua `grc20reg` (`token.gno`).

### 3.5 Không dynamic dispatch theo pkg path

Gno `import` là tĩnh. `p.HookPkg == "gno.land/r/zdex/hooks/twap"` **không**
mở được package lúc runtime.

Hệ quả: allowlist = **tập import của một generation**. Hook mới = package
mới (DEX generation hoặc hook-router generation) + `SetModule` /
`SetNextPkg` (`upgrade.gno`). String trên pool chỉ chọn nhánh `switch`
đã compile.

### 3.6 Immutable packages

Gno package không upgrade tại chỗ. Live: `gno.land/r/zdex/v2`,
`Version` / `Caps` / `NextPkg` / `Modules`. Hook surface gắn generation
sau (`v3` hoặc module `hooks`), LP/order ở v2 đứng yên.

### 3.7 Panic cross-realm

Panic qua boundary **abort cả tx**. Hook AfterSwap panic → swap revert.
Tốt cho invariant; xấu nếu oracle/reward không thiết yếu chặn exit
(ToB pattern 6). TWAP v1: observe không panic trừ note không hợp lệ từ
DEX (bug DEX, không phải user).

### 3.8 Reentrancy

Gno không có `nonReentrant` sẵn. Hook `cross(cur)` rồi gọi lại
`SwapExactIn` = nested. Cần flag in-flight trên DEX. `recover` không bắt
panic cross-realm.

---

## 4. Feature v4 — impossible hoặc nguy hiểm trên Gno

| Feature v4 | Trên Gno | Lý do |
|---|---|---|
| CREATE2 address flags | Impossible | Pkg path, không mine bit. Caps = `uint32` + allowlist |
| `IUnlockCallback` / `unlock(bytes)` | Dangerous / Class 4 | Caller-supplied callback dưới authority DEX |
| Flash accounting + EIP-1153 | Impossible | Không transient storage. State persist hoặc `/e/` per-tx |
| `take` / `settle` / ERC-6909 mint | Dangerous | Banker push-only; OriginSend một envelope; hook giữ quỹ = custodial AMM |
| `beforeSwapReturnDelta` / AsyncSwap | Dangerous — **cấm v1** | Hook thay curve; conservation ≠ correctness (Bunni) |
| `afterSwapReturnDelta` (hook fee) | Dangerous — **cấm v1** | Skim output sau khi DEX đã `minOut`; silent theft |
| LP return-delta | Dangerous — **cấm v1** | Đổi `outU`/`outT` sau slippage check |
| Dynamic fee không bound | Dangerous | `FeeBps=9999` nuốt input; phá `splitFee` + points |
| `hookData bytes` | Dangerous | Opaque user blob. Note do DEX điền |
| Donate | Out of scope | Không có trong ABI Zdex; LP fee đã nằm reserve |
| Proxy hook cùng address | Không tồn tại (tốt) | Package immutable. Path mới = generation mới |
| Gắn hook lên pool cũ | Cấm | Giống v4: hook ∈ identity. Pool id vẫn `ugnot\|SYMBOL` |
| `IHooks` lưu trên `Pool` | Cấm | Open interface + persist; Class 3 |
| Scratch `var lastPrice` giữa before/after | Dangerous | Shared hook phục vụ nhiều pool; nested swap (ToB 7) |

Cái **làm được** và nên làm: after-callback observe; before-callback
**revert-only gate** (allowlist trader — không đổi amount); fee override
**bounded, generation sau**, DEX áp `validSwapFee` / cap, không tin số
hook trả về tuyệt đối.

---

## 5. Kiến trúc đề xuất

```
gno.land/p/zdex/hooks/v1          types, Caps, note, TWAP math (pure)
gno.land/r/zdex/v2                live DEX — không đụng ABI
gno.land/r/zdex/v3  (tương lai)   dispatch + in-flight lock + HookPkg
gno.land/r/zdex/hooks             router: allowlist + switch tĩnh
gno.land/r/zdex/hooks/twap        first hook (AfterSwap only)
```

DEX generation **chỉ import router**, không import từng hook. Router
import allowlisted `/r/` và `switch pkg`. Thêm hook = router generation
mới; admin `SetModule("hooks", newRouterPkg)`. `SwapExactIn` không đổi tên.

Pool field (generation có hook, zero-value an toàn):

```go
// bổ sung trên Pool — KHÔNG ship vào v2 live trong research này
HookPkg  string // "" = none; else key allowlist
HookCaps uint32 // copy lúc Create; DEX không tin Caps() của hook
```

`Pool` stays `/r/`-declared (safety hypothesis A). Không nhúng `/p/` type
có higher-order callback (hypothesis B — `avl.Iterate` đã là vector; đừng
thêm).

---

## 6. Interface đề xuất — `gno.land/p/zdex/hooks/v1`

`/p/` **không** chứa crossing function. Không `func()`. Không `cur realm`
trên interface. Không banker.

```go
package hooks

const (
	CapNone uint32 = 0

	CapAfterCreate   uint32 = 1 << 0
	CapBeforeSwap    uint32 = 1 << 1
	CapAfterSwap     uint32 = 1 << 2
	CapBeforeAddLiq  uint32 = 1 << 3
	CapAfterAddLiq   uint32 = 1 << 4
	CapBeforeRemove  uint32 = 1 << 5
	CapAfterRemove   uint32 = 1 << 6
)

// Cấm v1 (bit reserved, MustCaps reject):
//   1<<8  return-delta swap
//   1<<9  return-delta LP
//   1<<10 donate
//   1<<11 fee override   — generation sau, bound bởi DEX
const (
	capForbiddenDelta    uint32 = 1 << 8
	capForbiddenLPDelta  uint32 = 1 << 9
	capForbiddenDonate   uint32 = 1 << 10
	capForbiddenFeeOver  uint32 = 1 << 11
)

func MustCaps(c uint32) {
	if c&(capForbiddenDelta|capForbiddenLPDelta|capForbiddenDonate|capForbiddenFeeOver) != 0 {
		panic("zdex/hooks: forbidden cap")
	}
}

type SwapNote struct {
	PoolID    string
	Trader    address
	TokenIn   string
	AmountIn  int64
	AmountOut int64
	FeeBps    int64
	ReserveU  int64 // post-swap nếu After; pre-swap nếu Before
	ReserveT  int64
	VirtualU  int64
	Buy       bool
	Height    int64
}

type LiqNote struct {
	PoolID   string
	Provider address
	AmountU  int64
	AmountT  int64
	LP       int64
	ReserveU int64
	ReserveT int64
	TotalLP  int64
	Height   int64
}

type CreateNote struct {
	PoolID   string
	Creator  address
	Token    string
	Symbol   string
	AmountU  int64
	AmountT  int64
	FeeBps   int64
	Height   int64
}

// Observer là tài liệu hình dạng — DEX KHÔNG nhận Observer từ caller.
// Không type-assert. Không lưu vào Pool.
type Observer interface {
	Caps() uint32
	AfterCreate(CreateNote)
	BeforeSwap(SwapNote)
	AfterSwap(SwapNote)
	BeforeAddLiq(LiqNote)
	AfterAddLiq(LiqNote)
	BeforeRemove(LiqNote)
	AfterRemove(LiqNote)
}
```

Crossing ABI phía hook realm (cùng note, **thêm** `cur realm`):

```go
// gno.land/r/zdex/hooks/twap — ví dụ first hook
func Caps() uint32 { return hooks.CapAfterSwap }

func AfterSwap(cur realm, note hooks.SwapNote) {
	requireCallerDEX(cur) // cur.Previous().PkgPath() ∈ dexAllow
	record(note)          // không banker, không gọi lại zdex
}
```

`requireCallerDEX` check **PkgPath của previous realm**, không
`OriginCaller()` (trung gian DEX mới là immediate caller). EOA gọi thẳng
`AfterSwap` phải panic — đúng pattern Cork/ToB #1.

Router:

```go
func AfterSwap(cur realm, pkg string, note hooks.SwapNote) {
	if !cur.Previous().PkgPath() isDEX {
		panic("zdex/hooks: dex only")
	}
	switch pkg {
	case "gno.land/r/zdex/hooks/twap":
		twap.AfterSwap(cross(cur), note)
	default:
		panic("zdex/hooks: not allowlisted")
	}
}
```

Admin `AllowHook(cur, pkg, caps)` trên router: `mustOwner`, `MustCaps`,
pkg phải nằm trong `switch` (nhánh lạ panic lúc swap — fail closed).

---

## 7. Call order — không phá ABI hiện tại

Chữ ký giữ nguyên (`swap.gno`, `pool.gno`):

```text
SwapExactIn(cur realm, poolID, tokenIn string, amountIn, minOut, maxHeight int64) int64
SwapExactOut(cur realm, poolID, tokenOut string, amountOut, maxIn, maxHeight int64) int64
AddLiquidity(cur realm, poolID string, amountU, maxToken, minLP int64) int64
RemoveLiquidity(cur realm, poolID string, lp, minU, minT int64) (int64, int64)
CreatePool(cur realm, tokenKey, symbol string, amountU, amountT, feeBps int64) string
```

Hook **không** thêm `hookData`. DEX tự điền note.

### 7.1 SwapExactIn (generation có hook)

```text
assertNotPaused
assertDeadline
inFlight = true                         // reentrancy gate
p := getPool
if p.HookPkg == "" { /* path cũ y nguyên */ }

1. CHECKS
   amountIn > 0, minOut, tokenIn
   buy ⇒ IsUserCall + OriginSend == amountIn
   out := AmountOut(...)                // p.FeeBps; hook không đổi
   out >= minOut, assertSnipe
   if CapBeforeSwap: router.BeforeSwap(cross(cur), pkg, preNote)
        BeforeSwap chỉ được panic (gate). Không return amount/fee.

2. EFFECTS
   pullUserToken nếu sell
   splitFee + creditFees + creditSwapPoints
   cập nhật ReserveU / ReserveT
   maybeGraduate

3. AFTER (observe)
   if CapAfterSwap: router.AfterSwap(cross(cur), pkg, postNote)
        postNote.Reserve* = reserve mới. Hook không banker.

4. INTERACTIONS
   pushToken / sendUgnot / refund ExactOut

5. emit Swap
inFlight = false
return out
```

`Quote` / `QuoteIn` / `SpotPrice` **không** gọi hook (readonly, gas,
không crossing từ qeval). TWAP đọc bằng query trên hook realm.

### 7.2 AddLiquidity / RemoveLiquidity

v1 TWAP **tắt** LP caps. Path:

```text
CHECKS (ratio, slippage, lock, OriginSend amountU)
if CapBefore*: router.Before*(note)     // panic-only
EFFECTS (harvestLP, reserves, TotalLP, position)
if CapAfter*:  router.After*(note)
INTERACTIONS (sendUgnot / pushToken trên remove)
```

LP tax **không** nằm v1: sau `takeUgnot(amountU)` không pull thêm ugnot;
tax token đòi `TransferFrom` lần hai — phá “số gửi = số vào reserve”.

### 7.3 CreatePool

`CreatePool` **không** thêm arg (ABI freeze listing). Pool mới = `HookPkg=""`.

Function **mới**, generation sau:

```text
CreatePoolHooked(cur, tokenKey, symbol, amountU, amountT, feeBps, hookPkg string) string
```

Cùng body `CreatePool` + lookup allowlist + stamp `HookPkg`/`HookCaps` +
optional `AfterCreate`. Không `AttachHook` trên pool đã có — hook ∈
identity kinh tế dù `poolID` vẫn `ugnot|SYMBOL` (một symbol một pool;
hooked listing = symbol/path khác hoặc đợi pair model sau).

### 7.4 Book / points / fees

Escrow book (`book.gno`) và points (`points.gno`) không đi qua hook v1.
AfterSwap TWAP không đụng `AccPoints`, `epochPot`, `splitFee`. 80%
protocol ugnot → pot giữ nguyên.

---

## 8. Security gates

Áp dụng trước khi viết realm. Map Class Gno + ToB v4.

| Gate | Rule | Class / analog |
|---|---|---|
| G0 ABI freeze | Không đổi `SwapExactIn` / `AddLiquidity` / `CreatePool` | product |
| G1 No func() | Cấm `func(...)` param và field trên DEX + hook | Class 4 |
| G2 No cur on interface | `/p/` Observer không có `cur realm` | Class 1a/1b |
| G3 No stored interface | `Pool.HookPkg string`, không `Observer` | Class 3 |
| G4 Static allowlist | `switch` compile-time; string lạ panic | designation |
| G5 DEX-only callback | Hook: `cur.Previous().PkgPath()` ∈ DEX pkgs | ToB #1 Cork |
| G6 No OriginSend in hook | Hook không đọc envelope, không banker | payment |
| G7 No return-delta | Caps forbidden bits | ToB #3 Bunni |
| G8 In-flight lock | Nested Swap/LP/hook→DEX panic `zdex: reentrant` | ToB #7 |
| G9 CEI | Checks → effects → after-hook → send | reentrancy |
| G10 Fail-closed optional | AfterSwap TWAP không panic vì window đầy — drop oldest | ToB #6 |
| G11 Caps stamp lúc create | DEX copy caps; không gọi `Caps()` mỗi swap để đổi bit | ToB #5 |
| G12 Bound note | amount/reserve ≥ 0; Height = `runtime.ChainHeight()` do DEX ghi | Class 2 |
| G13 Secondary rlm | Helper `sendUgnot(_ int, rlm realm)` giữ `rlm.IsCurrent()` | Class 2 |
| G14 IsUserCall | ugnot path không đổi | payment |
| G15 Hypothesis A | `Pool` `/r/`-declared; note `/p/` là value copy | (A) |
| G16 No `/r/` type in DEX state | Không store `*twap.Oracle` trong `Pool` | D2 borrow |
| G17 Admin two-step | `AllowHook` qua admin hiện có (`ProposeAdmin`/`AcceptAdmin`) | ops |
| G18 Pause | `assertNotPaused` trước hook | admin.gno |
| G19 Event | `chain.Emit("Hook", "pool", id, "pkg", pkg, "op", "AfterSwap")` | index |
| G20 Tests | `gno test` filetest: EOA→hook panic; nested swap panic; empty HookPkg ≡ v2 | build |

### 8.1 Ai được phép gắn hook

- Admin allowlist pkg **trước**.
- Creator chọn `hookPkg` lúc `CreatePoolHooked` ∈ allowlist.
- Không permissionless “gắn hook Zdex rồi tạo pool độc hại” (ToB #2).
- User DEX thấy `HookPkg` trên `PoolInfo` / Render trước khi LP.

### 8.2 In-flight

```go
var inFlight bool

func enter() {
	if inFlight {
		panic("zdex: reentrant")
	}
	inFlight = true
}
func leave() { inFlight = false }
```

Panic giữa `enter`/`leave` revert cả tx — flag không kẹt. Đủ cho singleton
DEX một pool-tree. Không dùng transient; một tx một crossing stack.

---

## 9. First hook: TWAP oracle

Chọn **một**: TWAP, không phải protocol fee override, không phải LP tax.

### 9.1 Vì sao TWAP

| | TWAP AfterSwap | Fee override | LP tax |
|---|---|---|---|
| Đổi amount swap/LP | không | có (fee) | có |
| OriginSend / banker | không | không (nhưng đổi splitFee) | tax ugnot **không pull được** |
| Phá points / 1/6 protocol | không | có | gián tiếp |
| Phá minOut / minLP | không | có thể | có |
| Tiện book/limit sau này | có | ít | không |
| Attack surface | observe + DoS nếu panic | silent 100% fee | JIT / exit lock |

Fee override generation sau: DEX nhận `wantFee` rồi `validSwapFee` /
`feeBps <= maxFeeBps` (5/30/100). Hook không tự `splitFee`.

LP tax: banker push-only + OriginSend exact → không thu thêm ugnot trong
cùng `AddLiquidity`. Thu token = `TransferFrom` lần hai, allowance bất
ngờ. Để generation riêng, ABI mới.

### 9.2 Spec TWAP

Path: `gno.land/r/zdex/hooks/twap`. Caps: `CapAfterSwap` only.

Price cùng `SpotPrice` (`swap.gno`):

```text
den = ReserveU + VirtualU
priceX6 = MulDiv(ReserveT, 1_000_000, den)   // token per GNOT * 1e6
```

Dùng `gno.land/p/zdex/amm/v1.MulDiv` — overflow-safe, không float.

State (hook realm, không DEX):

```go
type obs struct {
	Height   int64
	PriceX6  int64
	CumulX6  int64 // + priceX6 * Δh ; wrap modulo 2^63? → panic nếu overflow, hoặc dùng 2-word
}

type series struct {
	Ring  []obs // bound N=32
	Head  int
	InitH int64
}
```

`AfterSwap`:

1. Gate DEX pkg.
2. `note.Height == runtime.ChainHeight()` (DEX điền; hook verify).
3. Tính `priceX6` từ `note.Reserve*`.
4. Nếu cùng height: overwrite last (một block một điểm — chống
   multi-swap manip trong block, vẫn window ngắn).
5. Else append; nếu đầy drop oldest.
6. `CumulX6 += priceX6 * (h - lastH)` qua `MulDiv`/`add64`; overflow →
   **không panic swap**: skip cumul, vẫn lưu spot (G10). Emit `TwapSkip`.

Query (non-crossing, qeval):

```text
Spot(poolID) (priceX6, height)
Observe(poolID, agoBlocks) (twapX6, startH, endH)
```

`Observe`: `twap = (cumul(end) - cumul(start)) / (endH - startH)`.
`agoBlocks <= 0` hoặc series ngắn hơn window → panic message ổn định
`zdex/twap: window` — query không đi trên swap path.

Không: feed cho `AmountOut` v1 (oracle không được đổi giá swap). Book
limit sau này đọc `Observe` **off-path** hoặc generation riêng.

### 9.3 Trust

TWAP on-chain = spot nội bộ, không phải Pyth. Manip trong window ngắn
vẫn được. First hook chứng minh **dispatch an toàn**, không phải oracle
cấp credit. Render ghi rõ: observational, no-advice (`zdex-trust`).

### 9.4 Gas / storage

32 obs × ~3 int64 + tree key `poolID`. Storage deposit theo byte. N=32
là cap cứng trong `/p/` const `MaxObs = 32`. Không unbounded iterate.

---

## 10. Việc **không** làm trong research này

- Không implement `/r/` hook realm hay sửa `gno.land/r/zdex/v2`.
- Không thêm field `HookPkg` vào `types.gno` live.
- Không `/p/zdex/hooks/v1` trên chain (design đủ; package nhỏ có test
  chỉ khi protocol lead quyết định generation).
- Không gnomemepad / Gno Vault.
- Không mainnet/Sapphire addpkg.
- Không mnemonic / raw gnokey.

Khi implement: `gno test ./gno.land/p/zdex/hooks/v1` rồi
`gno test ./gno.land/r/zdex/v2` (regression ABI). Broadcast testnet phải
announce + human yes.

---

## 11. Generation plan (khi human yes)

1. `/p/zdex/hooks/v1` — Caps, notes, `MustCaps`, TWAP cumul helpers + test.
2. `/r/zdex/hooks/twap` — AfterSwap + Observe; DEX-only gate; filetest EOA
   bị từ chối.
3. `/r/zdex/hooks` router — `AllowHook`, switch một nhánh twap.
4. DEX v3 (path mới): copy v2 + `HookPkg` zero-value + in-flight +
   AfterSwap sau effects, trước send. `CreatePool` giữ chữ ký.
   `CreatePoolHooked` mới. `Caps()` string thêm `hooks`.
5. `SetNextPkg` / `SetModule("hooks", ...)` từ v2 admin — LP v2 không
   migrate.
6. UI `web/` đọc `HookPkg` (zdex-product, English). Không bắt buộc cho
   TWAP v1.

Rollback: pool `HookPkg=""` ≡ v2. Gỡ hook = ngừng tạo pool hooked; pool
đã stamp không đổi pkg (immutable attachment).

---

## 12. Checklist review (zdex-security)

- [ ] Không `func()` trên API công khai DEX/hook
- [ ] Không interface method `cur realm`
- [ ] Không persist `realm` / `Observer`
- [ ] Hook callback: `cur.Previous().PkgPath()` DEX, không `OriginCaller`
- [ ] Helper banker: `rlm.IsCurrent()`
- [ ] ugnot: `IsUserCall` + OriginSend exact, hook không đụng
- [ ] Before* không return amount; After* không banker
- [ ] Nested swap panic
- [ ] Empty hook path bitwise identical accounting với v2 test vectors
- [ ] TWAP overflow không revert swap
- [ ] `gno test ./gno.land/r/zdex/` và `./gno.land/r/zdex/v2` xanh

---

## 13. Tham chiếu

Uniswap: `IHooks`, Hooks.sol flags, flash-accounting guide, AsyncSwap,
Trail of Bits “Building secure Uniswap v4 hooks” (2026-07-30).

Gno: `security.md` Class 1–4, hypothesis A/B/C; `interrealm.md` crossing /
readonly taint / no persist realm; `patterns.md` `/p/` types + `/r/`
runtime, OriginSend, banker push-only.

Zdex: `AGENTS.md` facts (OriginSend, MulDiv, fee 5/30/100, protocol ~1/6,
points, escrow, immutable hub, pool id `ugnot|SYMBOL`).
