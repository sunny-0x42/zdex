# Incentives routing — sidecar, không copy v3

Date: 2026-09-06  
Seat: `zdex-chief`  
Scope: route only. Không viết realm/UI. Không addpkg. Không broadcast.

Pearl live (immutable, **0 pools**):

- DEX: `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/v2`
- AMM: `gno.land/p/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/amm/v1`
- UI: https://zdex-gno.netlify.app default pearl

Repo source: `gno.land/r/zdex/v2`. Live Caps / `validModule` chỉ: `swap`, `lp`, `create`, `book`, `points`, `quote`, `admin`.

---

## Quyết định

**Sidecar** `gno.land/r/zdex/incentives/v1`  
Pearl path sau yes: `gno.land/r/g1mv0052e7r6s09f5t9xsqf00nj3tqsgt9dg52jr/zdex/incentives/v1`

**Không** copy toàn bộ DEX thành `v3` để nhét farm vào swap/LP.  
**Không** patch-in-place Pearl v2 (`SwapExactIn` / `AddLiquidity` / `splitFee` đứng yên).

Incentives là **module realm mới**: state reward riêng, `Version` / `Caps` / `NextPkg` riêng. Upgrade farm sau này = `incentives/v2` sidecar, không phải generation AMM mới.

---

## NextPkg vs sidecar

| Cửa | Dùng khi | Không dùng khi |
|---|---|---|
| **Sidecar** `…/zdex/incentives/v1` | Thêm surface mới (farm / boost / emission) mà không đụng reserve AMM. Upgrade-per-module. | Coi farm là “DEX v3”. |
| **`SetNextPkg` trên v2** | Successor **hub DEX** (toàn bộ listing/swap/LP chuyển UI sang path mới). | Trỏ vào sidecar farm. `NextPkg` = generation AMM, không phải reward pkg. |
| **`SetModule(name, pkg)` trên v2** | Retarget UI cho **tên đã có** trong `validModule` (`book` → `book/v3`, v.v.). State cũ ở lại v2. | `SetModule("incentives", …)` — **panic**. Tên không nằm `validModule` live. Caps() v2 **không lớn được**. |

Hệ quả discovery:

- UI DEX: `HubSnapshot` / `Modules` của **v2** — swap/lp/create/book/points/quote/admin.
- UI farm: path sidecar (config / render sidecar). Không giả `Caps` v2 có `incentives`.
- Default: **không** gọi `SetNextPkg` trên Pearl v2 cho việc này. v2 ở lại live DEX.

Thin hub v3 (chỉ nới `validModule` + `ModuleOf("swap")` = path v2, `ModuleOf("incentives")` = sidecar) là option **sau**, vẫn là pkg mới + human yes. Không phải copy swap/LP. Không làm trong week item này.

---

## Vì sao không v3 copy

Gói rỗng (0 pools) **không** phải lý do copy DEX:

1. Package Gno immutable. Copy v3 = mọi pool **sau này** nằm v3; farm upgrade tiếp theo lại v4 — đúng pattern làm gãy live platform.
2. `SetModule` trên v2 đã là upgrade-per-module cho surface **đã freeze**. Surface **mới** phải pkg mới, không cần clone AMM.
3. Frozen product: LP swap fee ~5/6, **không** stake thêm. Nhét farm vào v3 swap/LP dễ biến thành MasterChef (stake LP để lấy fee) — cấm.
4. 0 pools = **không có LP migrate**, dù sidecar hay v3. Sidecar hưởng lợi đó mà không đốt generation AMM.

v2 **ở lại**. Pool mới vẫn `CreatePool` trên v2. Sidecar đọc v2 (import tĩnh / query), không giữ `ReserveU`/`ReserveT`.

---

## Frozen (incentives không được phá)

- DEX-only `CreatePool`. `Launch` legacy.
- Native `ugnot` `OriginSend`. Không wugnot.
- Fee 5 / 30 / 100 bps. Protocol ~1/6, LP ~5/6 **trong pool**. Không extra stake để nhận LP swap fee.
- 80% protocol ugnot → epoch pot **trên v2** (`points.gno`). Sidecar không hớt pot, không đổi `splitFee`.
- Points volume + LP AccPoints giữ nguyên trên v2.

Incentives = **reward thêm** (emission / boost pool), không thay thế LP fee và không thay epoch pot.

---

## Upgrade-per-module (tương lai)

```
v2 DEX          — freeze AMM. SetModule chỉ với tên đã có. SetNextPkg chỉ khi thay hub DEX.
incentives/v1   — farm v1. NextPkg của sidecar → incentives/v2 khi farm thay đời.
book (sau này)  — SetModule("book", book/v3) trên v2; order cũ ở v2.
hooks (research)— pkg riêng; không nhét vào swap v2. Xem hooks-gno.md.
```

Một chữ ký admin `SetNextPkg` / `SetModule` là **trust UI** (security.md). Liquidity không migrate theo pointer.

---

## Route

| Seat | Việc | Không làm |
|---|---|---|
| `zdex-protocol` | Realm `gno.land/r/zdex/incentives/v1` + test. Own Caps. Import/read v2, không sửa `r/zdex/v2` swap/LP. | Patch Pearl v2. Copy v3. addpkg. |
| `zdex-defi` | Công thức reward; chứng minh fee LP 5/6 + pot 80% không đổi; không farm-stake cho swap fee. | Đổi `splitFee` / `creditSwapPoints`. |
| `zdex-product` | English UI: DEX theo v2 `HubSnapshot`; farm theo sidecar path. No-advice, không APY. | Production deploy. |
| `zdex-security` | Review (không owner): không pull ugnot nhầm, EOA, không panic chặn swap v2. | PoC exploit. |
| `zdex-devops` | Deploy tree khi protocol xanh. Packet sẵn. | Broadcast. |
| `zdex-trust` | Copy: extra rewards ≠ guaranteed yield; testnet Pearl. | Tweet. |

---

## Human yes (cổng đóng)

Cả hai đều **yes** rồi mới đụng Pearl. Agent không broadcast, không mnemonic, không raw `gnokey`.

1. **Pearl addpkg** `…/zdex/incentives/v1` (và `/p/` nếu có math mới — không đụng AMM v1 đã live).
2. **`SetNextPkg` trên Pearl v2** — mọi lần gọi. Routing: **không** trỏ `NextPkg` vào sidecar. Chỉ hỏi yes nếu human chọn successor hub DEX (không phải week này).

Repo + `gno test` + UI test: không cần yes.

---

## Residual

- Live v2 không bao giờ liệt kê `incentives` trong `Modules()` / `Caps()`.
- 0 pools hôm nay → sidecar không migrate LP; mai có pool thì LP vẫn ở v2.
- Sapphire v1 path riêng; không gộp “live” với Pearl.
