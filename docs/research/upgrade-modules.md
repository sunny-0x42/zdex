# Upgrade một module — không đụng live platform

Status: research / design. Không deploy. Không addpkg. Không sửa realm
live. **Hooks không phải ship này** — xem `docs/research/hooks-gno.md`.

Câu hỏi: làm sao thêm / thay **một** surface (incentives, book, …) mà
không phá AMM / LP / book đang chạy.

Nguồn Zdex: `gno.land/r/zdex/v2/upgrade.gno`, `state.gno`, `swap.gno`,
`pool.gno`, `book.gno`, `points.gno`; hub v1 `gno.land/r/zdex/upgrade.gno`;
UI `web/src/lib/hub.ts`, `web/chain.mjs`, `web/config.js`; Pearl packet
`deploy/pearl/`, `deploy/PEARL.md`. Nguồn Gno: addpkg immutable, import
tĩnh, namespace `g1…` trên Pearl.

Không phải investment advice. Không promise migrate LP.

---

## 1. Kết luận ngắn

Gno `addpkg` **không overwrite**. Path Pearl live

`gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`

không thể nhận thêm tên trong `validModule`. Slot v2 đóng cứng:
`swap`, `lp`, `create`, `book`, `points`, `quote`, `admin`.
`SetModule("incentives", …)` trên v2 panic `zdex: unknown module`.

Hub `Version` / `Caps` / `NextPkg` / `Modules` là **bảng chỉ đường cho
UI**, không phải vtable VM. `SetModule` ghi string vào `modules` AVL.
SwapExactIn vẫn chạy trong **cùng package**, cùng `pools` / `pos` /
`orders`. Không `import` theo string. Không chuyển state.

Đường đúng cho surface **mới** (incentives):

1. **Bây giờ:** sidecar `gno.land/r/zdex/incentives/v1` (local) —
   realm độc lập, v2 không import.
2. UI đọc `incentivesPkg` từ `web/config.js` (cùng kiểu `pkg` /
   `hubPkg`). Không đợi slot hub.
3. **Sau:** generation v3 thêm slot `"incentives"` vào `validModule` +
   `Caps`. Admin `SetModule("incentives", newPkg)` khi đã có
   `/incentives/v2`.
4. Swap / LP / book **ở lại v2**. Pearl 0 pool → không migrate.

Cấm: `func()` hook, dynamic import pkg string, overwrite v2, copy
Uniswap hooks 1:1.

---

## 2. addpkg immutable

Gno package = path một lần. Comment trong `upgrade.gno`:

```text
// protoVersion is this realm generation. Gno packages are immutable:
// v2 is this path. A later /v3 ships as a new package; LP here stays.
```

Hệ quả:

| Muốn | Được? | Cách |
|---|---|---|
| Sửa `validModule` trên path v2 đã addpkg | Không | Generation mới `/v3` |
| Thêm hàm `ClaimIncentive` vào live v2 | Không | Sidecar hoặc v3 |
| Đổi `Caps()` const | Không | v3 `defaultCaps` |
| Trỏ UI sang pkg mới | Có | `SetNextPkg` / `SetModule` / config |
| Chuyển `pools` AVL v2 → v3 | Không (không có primitive) | User LP lại; hoặc không migrate |
| Xóa / thay bytecode v2 | Không | Path cũ sống mãi |

Pearl: namespace `zdex` chưa authorized (`IsAuthorizedAddressForNamespace`
= false). Live path **không** phải `gno.land/r/zdex/v2` mà là
`gno.land/r/<g1>/zdex/v2`. Một khi addpkg xong, path đó đóng.

Local source vẫn `gno.land/r/zdex/v2` + `gno.land/p/zdex/amm/v1`. Packet
Pearl rewrite — §8.

---

## 3. Hub — bốn field, bốn việc

`upgrade.gno` export. UI đọc qua qeval (`web/chain.mjs` `loadHub`).

| Field | Type on-chain | Việc thật | Không làm |
|---|---|---|---|
| `Version()` | const `"2"` | ABI generation. Client biết chữ ký `SwapExactIn` / `AddLiquidity` / `CreatePool` ổn định | Không semver bytecode |
| `Caps()` | const `"swap;lp;create;book;points;quote;feeShare;noStakeLp"` | Feature-gate tab (`tabsFor` trong `hub.ts`) | Không bật cap mới trên v2 |
| `NextPkg()` | `var nextPkg string` | Admin `SetNextPkg`: “generation kế”. UI `followPkg` | Không chuyển LP/order |
| `Modules()` | AVL `name → pkg` + dump `name;pkg` mỗi dòng | UI `pkgForFunc`: `PlaceBid` có thể gọi pkg khác `SwapExactIn` | Không dispatch VM |

`HubSnapshot()` = `version;thisPkg;nextPkg;caps` (caps chứa thêm `;`).
Parse: `parseHubSnapshot` — field 0–2 rồi phần còn lại là caps.

`ThisPkg()` = `unsafe.CurrentRealm().PkgPath()`. Không config.

Admin: `mustOwner`. Test `TestUpgradeHub` — non-admin abort
`zdex: admin only`. Một chữ ký; trust UI (`docs/research/security.md`).

---

## 4. `Modules` không phải VM delegate

`SwapExactIn`, `AddLiquidity`, `PlaceBid` là hàm **cùng package**
`package zdex`. `ModuleOf` **không** được gọi từ `swap.gno` /
`pool.gno` / `book.gno` — chỉ từ `Modules()` và test.

```text
MsgCall pkg=v2 func=SwapExactIn
        │
        ▼
   v2.SwapExactIn  ──► v2.pools AVL, v2.points, v2.banker
        │
        ✗ không đọc modules["swap"]
        ✗ không import path string
```

UI thì có:

```text
pkgForFunc(live, "PlaceBid") → live.modules["book"] || live.pkg
Adena MsgCall tới path đó
```

`SetModule(cur, "book", "gno.land/r/…/book/v3")`:

- Ghi string. Emit `SetModule`.
- `ModuleOf("book")` trả path mới.
- `orders` AVL **vẫn** trong v2. Book v3 là realm trống trừ khi tự
  giữ escrow.
- Swap v2 không biết book v3.

Đó là lý do **không** “chuyển book một mình” bằng `SetModule` nếu
muốn cùng sổ lệnh với AMM. `SetModule` hữu ích khi:

1. Surface **mới**, state riêng (incentives sidecar) — UI gọi pkg khác.
2. Generation **đầy đủ** (v3 copy AMM+LP+book) — `NextPkg`, user mới
   list/swap ở đó; LP v2 ở lại.

Tên lạ: `validModule` false → `ModuleOf` trả `thisPkg()`,
`SetModule` panic `zdex: unknown module`. `Modules()` chỉ liệt kê
`moduleNames()` — không có chỗ cho `"incentives"` trên v2.

---

## 5. Slot freeze — Pearl v2 không thêm tên

`validModule` / `moduleNames` compile-time:

```text
swap | lp | create | book | points | quote | admin
```

Cùng list trên hub v1 (`protoVersion = "1"`). Thêm slot = **sửa
source rồi addpkg path mới**. Path đã live không nhận patch.

| Hành động trên Pearl v2 | Kết quả |
|---|---|
| `SetModule("book", sidecar)` | Ghi pointer UI. State book không dời |
| `SetModule("incentives", sidecar)` | Panic `unknown module` |
| `SetNextPkg(v3)` | UI có thể follow; LP v2 đứng |
| Sửa `upgrade.gno` rồi addpkg **cùng** path | Reject — package tồn tại |
| addpkg `/r/<g1>/zdex/v3` | Path mới, `validModule` mới được |

`Caps` cũng const. UI không thấy `incentives` cho đến v3 (hoặc config
cứng `incentivesPkg`).

---

## 6. Sidecar incentives — khuyến nghị

Incentives **không** nằm trong fee split AMM (`splitFee`,
`creditSwapPoints`, epoch pot). Đó là chương trình riêng: điểm /
reward realm, không đụng `ReserveU` / `TotalLP`.

### 6.1 Bây giờ (generation v2 sống)

```
gno.land/r/zdex/incentives/v1          source local
gno.land/r/<g1>/zdex/incentives/v1     Pearl (rewrite như AMM)
```

- Realm riêng. Crossing của **nó**. v2 **không** `import`.
- Không `func()` từ swap. Không AfterSwap hook (hooks = research
  khác, không ship).
- Quan sát volume/LP: query `Snapshot` / event indexer off-path, hoặc
  user gọi `Ping` trên sidecar sau swap (opt-in, không nhúng v2).
- UI: `NETWORKS.pearl.incentivesPkg = "gno.land/r/<g1>/zdex/incentives/v1"`.
  Fallback rỗng = ẩn tab. Không cần `SetModule`.

### 6.2 Sau — khi v3 có slot

v3 (path mới) copy hub + thêm:

```text
modIncentives = "incentives"
validModule gồm incentives
defaultCaps += ";incentives"
```

Admin trên **v3** (hoặc hub mà UI đang follow):

```text
SetModule("incentives", "gno.land/r/…/zdex/incentives/v2")
```

`/incentives/v2` = sidecar thế hệ 2 (sửa rule reward). v1 sidecar giữ
sổ cũ; không overwrite. `SetModule` chỉ đổi **pointer UI**.

Cho đến khi v3 addpkg: **không** giả slot bằng cách `SetModule` tên
lạ — v2 sẽ panic.

### 6.3 Việc sidecar không được làm

- Không `cross(cur)` vào `SwapExactIn` để “hook reward” (reentrancy,
  Class 1 nếu forward `cur`).
- Không giữ quỹ LP. Banker của sidecar = reward của sidecar, không
  `OriginSend` hộ AMM.
- Không đọc `modules["swap"]` rồi dynamic import.

---

## 7. Swap / LP / book ở lại v2 — không migrate

Pearl snapshot: **0 pool** (`pools.Size()==0` nếu chưa list; packet
chưa broadcast thì cũng không có state). Không có LP, không có order
mở → không bài toán migrate.

Dù mai có pool:

| Surface | State | Ở đâu |
|---|---|---|
| Swap / quote | `pools` AVL, `Reserve*`, fee buckets | v2 mãi |
| LP | `pos`, `TotalLP`, `minLiquidity` burn | v2 mãi |
| Book | `orders` escrow | v2 mãi |
| Points / fee-share | `scores`, `epochPot` | v2 (cùng generation với swap) |
| Incentives | sổ riêng | sidecar |

User muốn AMM mới = list **pool mới** trên v3. LP v2 không chuyển
(trust: `docs/research/trust.md` cấm promise migrate). 0 pool hôm nay
= không ai bị kẹt; vẫn không overwrite v2 “cho tiện”.

`NextPkg` từ v2 → v3 khi v3 sẵn. UI `useNextPkg` / `followPkg`. Swap
client không rewrite chữ ký (`FUNC_SURFACE` giữ tên hàm).

---

## 8. Pearl packet — rewrite import như AMM

Local:

```
gno.land/p/zdex/amm/v1
gno.land/r/zdex/v2
```

Pearl (namespace enforcement từ block 1):

```
gno.land/p/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/amm/v1
gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2
```

`deploy/pearl/r-v2/math.gno` đã import AMM g1. `gnomod.toml` `module`
khớp `deploy_path`. Source `gno.land/r/zdex/v2/math.gno` **giữ**
`gno.land/p/zdex/amm/v1`.

Mọi package **mới** (incentives v1, hooks router sau này, v3) phải:

1. addpkg `/p/<g1>/…` trước nếu realm import `/p/`.
2. Rewrite mọi `import "gno.land/p/zdex/…"` và `gno.land/r/zdex/…`
   sang `gno.land/{p|r}/<g1>/zdex/…` trong **packet**, không trong
   tree local trừ khi protocol lead đổi source of truth.
3. `gnomod.toml` `module` = path addpkg.
4. Không addpkg `gno.land/r/zdex/incentives/v1` trên Pearl — namespace
   `zdex` fail giống AMM.

Không broadcast từ agent. Không mnemonic. Không raw `gnokey`.

---

## 9. Cấm (cùng generation này)

| Pattern | Vì sao chết |
|---|---|
| `func()` / bound method trên DEX hoặc sidecar | Class 4 closed-over-authority. `hooks-gno.md` — **không ship hooks** |
| Dynamic `import` theo string `ModuleOf("swap")` | Gno import tĩnh. String là key UI / allowlist compile-time, không `address.call` |
| Overwrite path v2 | addpkg immutable |
| `SetModule` tin là đã chuyển LP/order | AVL không dời; user gửi tx vào pkg trống |
| Nhét `"incentives"` vào v2 bằng sửa file rồi addpkg cùng path | Reject |
| Forward `cur` (không `cross(cur)`) vào sidecar | Class 1a/1b |
| Sidecar `OriginSend` / pull ugnot hộ swap | Envelope một lần; confused payment |
| Proxy / CREATE2 “cùng address, code mới” | Không tồn tại trên Gno. Path mới = generation mới |

Hooks (TWAP AfterSwap, router allowlist) = feasibility **khác**. Không
trộn vào ship incentives. Không clone Uniswap v4.

---

## 10. Durable rules — protocol + product

1. **Package path là identity.** addpkg một lần. Sửa ABI / slot /
   `Caps` = path mới (`/v3`, `/incentives/v2`). Không overwrite live
   Pearl v2.

2. **`Modules` là pointer UI, không phải delegate VM.** `SetModule`
   không chuyển `pools` / `pos` / `orders` / `scores`. MsgCall surface
   nào thì state realm đó.

3. **`validModule` đóng theo generation.** Tên ngoài list: `SetModule`
   panic, `ModuleOf` fallback `thisPkg()`. Slot `"incentives"` chỉ có
   từ v3. Trước đó UI dùng `incentivesPkg`.

4. **`Version` / `Caps` / `NextPkg` / `Modules` đọc độc lập.** Thiếu
   `Caps` → probe query. Thiếu `Modules` → mọi func về `pkg`.
   `NextPkg` rỗng = chưa có successor. Client không hardcode path
   trừ fallback `config.js`.

5. **Swap / LP / book / points-feeShare ở lại v2.** Cùng k, cùng
   escrow, cùng epoch pot. Tách book bằng `SetModule` = hai sổ.
   Không migrate. Pearl 0 pool không đổi rule này.

6. **Surface mới = sidecar `/r/…/incentives/v1` ngay**, không đợi
   v3, không import từ v2. Reward v2 = `/incentives/v2` +
   `SetModule` khi hub đã có slot. UI `incentivesPkg` cho đến lúc đó.

7. **Import tĩnh.** Không load pkg từ string lúc runtime. Cross-realm
   chỉ `cross(cur)` tới package đã `import`. Allowlist = tập import
   của generation đó.

8. **Pearl packet rewrite namespace g1** giống AMM. Local path
   `gno.land/{p\|r}/zdex/…` không addpkg được trên Pearl. `gnomod.toml`
   `module` = `deploy_path`. Không copy `token.gno` local nếu GRC20
   Pearl khác chữ ký.

9. **Không `func()` hook, không dynamic import, không nhúng
   AfterSwap vào v2 cho incentives.** Hooks là research riêng. Incentives
   opt-in trên sidecar hoặc đọc snapshot off-path.

10. **Admin hub là trust UI.** `SetNextPkg` / `SetModule` một chữ ký
    (`mustOwner`). Pointer độc → UI gọi pkg lạ; **liquidity không
    theo**. Product: hiện `ThisPkg` / `NextPkg` / `Modules` trên
    Overview; `followPkg` có confirm. Không auto-switch im lặng.

11. **Chữ ký live freeze.** `SwapExactIn` / `AddLiquidity` /
    `CreatePool` / `PlaceBid` giữ tên. Sidecar thêm hàm **mới** trên
    path mới. Product map `FUNC_SURFACE` chỉ khi hub `Caps` có surface
    hoặc config `incentivesPkg` khác rỗng.

12. **Không promise migrate / APY / airdrop từ việc đổi module.**
    Points v2 ≠ token incentives sidecar. Trust copy: package
    immutable, LP ở lại path cũ.

---

## 11. Next ship item (khuyến nghị)

**Sidecar `/r/zdex/incentives/v1` + `incentivesPkg` trên UI.** Không
v3. Không hooks. Không sửa `validModule` v2. Không addpkg cho đến
human yes.

Thứ tự khi protocol lead yes:

1. Spec realm sidecar (research này đủ hướng; code = `zdex-protocol`).
2. Packet Pearl: rewrite `gno.land/r/<g1>/zdex/incentives/v1`.
3. `web/config.js` thêm `incentivesPkg` per net; tab ẩn nếu rỗng.
4. v3 (sau, không tuần này): slot `incentives` + `SetModule`.

Rollback: bỏ `incentivesPkg` → UI DEX v2 như cũ. AMM không revert.

---

## 12. Checklist (khi implement — không làm trong note này)

- [ ] v2 `upgrade.gno` không thêm `modIncentives`
- [ ] Sidecar không `import` `gno.land/r/zdex/v2` (và ngược lại)
- [ ] Không `func()` / interface `cur realm` / persist `realm`
- [ ] Pearl import g1, `gnomod.toml` khớp
- [ ] UI `pkgForFunc` swap/lp/book vẫn v2
- [ ] `gno test ./gno.land/r/zdex/` và `./gno.land/r/zdex/v2` xanh
- [ ] Không addpkg / gnokey / mnemonic từ chat

---

## 13. Tham chiếu

- `gno.land/r/zdex/v2/upgrade.gno` — `validModule`, `SetModule`,
  `Modules`, `HubSnapshot`
- `gno.land/r/zdex/v2/state.gno` — `modules avl.Tree`
- `gno.land/r/zdex/v2/zdex_test.gno` `TestUpgradeHub`
- `web/src/lib/hub.ts` — `parseModules`, `pkgForFunc`
- `web/chain.mjs` — `loadHub` qeval `HubSnapshot()` / `Modules()`
- `web/config.js` — `pkg` / `hubPkg` / Pearl g1 path
- `deploy/pearl/README.md`, `deploy/PEARL.md` — rewrite AMM g1
- `docs/research/hooks-gno.md` — không ship ở đây
- `docs/research/security.md` — `SetModule` tin UI
- `docs/research/trust.md` — cấm promise migrate LP
