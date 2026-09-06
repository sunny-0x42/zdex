# Pearl deploy packet (zdex v2)

Human **yes** 2026-09-06: complete + Pearl deploy.

Tried `gno_addpkg profile=pearl simulate=true` → **refused**: `chain-id "pearl-1" is read-only — read-only chains have no agent key`.

Stock gnomcp treats `pearl-1` like mainnet/betanet. This agent **cannot** broadcast addpkg to Pearl (and will not run `gnokey`).

Packet is ready. Broadcast needs a gnomcp that marks Pearl writable, or the user signing with their own key outside this chat.

## Chain

| | |
|---|---|
| chain-id | `pearl-1` |
| RPC | `https://rpc.pearl.testnets.gno.land:443` |
| gnoweb | `https://pearl.testnets.gno.land` |
| faucet | `https://pearl.testnets.gno.land/faucet` |

Pearl / Test16. Namespace enforcement `gno.land/r/sys/names` **enabled** từ block 1 — chỉ PA namespace `g1…` được addpkg, trừ khi tên đã authorized.

Snapshot (2026-09-06): node up, height **238230**. `@zdex` trống. `gno.land/p/zdex/amm/v1` **không tồn tại** (`vm/qfile`: invalid package). `IsAuthorizedAddressForNamespace(<g1>, "zdex")` = **false**.

Deps genesis **đã có** (không addpkg): `gno.land/p/demo/tokens/grc20`, `gno.land/p/nt/avl/v0`, `gno.land/p/nt/seqid/v0`, `gno.land/p/nt/ufmt/v0`, `gno.land/p/nt/markdown/sanitize/v0`, `gno.land/r/demo/defi/grc20reg`.

## gnomcp profile `pearl`

gnomcp **phải** có profile tên `pearl`, thêm qua gnoweb URL (discover RPC + chain-id):

```
gno_profile_add  name=pearl  gnoweb_url=https://pearl.testnets.gno.land
```

Persist (user CLI, không phải bước packet):

```
gnomcp profile add pearl --gnoweb https://pearl.testnets.gno.land
```

Sau `gno_connect`: `--rpc https://rpc.pearl.testnets.gno.land --chain-id pearl-1`.

Cảnh báo: stock gnomcp coi chain-id ngoài `dev` / `test*` / `topaz-*` là **read-only**. `pearl-1` rơi vào nhóm đó → `gno_addpkg` `profile=pearl` có thể bị từ chối dù profile đã add. Session hiện tại: profile `pearl` đã load, read-only. Không addpkg ở đây.

## Deploy path

Thứ tự bắt buộc:

1. AMM `/p/` (nếu realm sẽ import path đó).
2. Realm `gno.land/r/<agent-g1>/zdex/v2`.

`gnomod.toml` trong packet vẫn là path local. Trước addpkg: đổi `module` khớp `deploy_path`, hoặc **omit** `gnomod.toml` để gnomcp generate.

## Namespace — import `gno.land/p/zdex/amm/v1` SẼ FAIL trên Pearl

`deploy/zdex-v2/math.gno` (sync từ source) import:

```
"gno.land/p/zdex/amm/v1"
```

Trên Pearl:

- Package đó **chưa** on-chain.
- addpkg vào `gno.land/p/zdex/amm/v1` **fail** vì namespace `zdex` không phải `g1…` và chưa authorized.

**Kết luận:** realm import `gno.land/p/zdex/amm/v1` **sẽ fail** trên Pearl (namespace).

Cách đúng sau khi có agent-g1 (human yes, chưa làm):

1. addpkg AMM → `gno.land/p/<agent-g1>/zdex/amm/v1`
2. Sửa `math.gno` import + comment cho khớp path đó; sửa `deploy/p/zdex/amm/v1/gnomod.toml` `module`
3. addpkg realm → `gno.land/r/<agent-g1>/zdex/v2`

Packet **giữ** import local cho đến khi có g1 và rewrite có yes.

## Files `gno_addpkg`

Không đưa `*_test.gno`.

### 1) AMM — dir `deploy/p/zdex/amm/v1`

`deploy_path`: `gno.land/p/<agent-g1>/zdex/amm/v1` (không dùng `gno.land/p/zdex/amm/v1`)

| name | note |
|---|---|
| `amm.gno` | bắt buộc |
| `gnomod.toml` | optional; nếu gửi thì `module` phải = `deploy_path` |

### 2) Realm v2 — dir `deploy/zdex-v2`

`deploy_path`: `gno.land/r/<agent-g1>/zdex/v2`

| name | note |
|---|---|
| `admin.gno` | |
| `book.gno` | |
| `launch.gno` | |
| `math.gno` | **đổi import AMM** trước addpkg |
| `points.gno` | |
| `pool.gno` | |
| `query.gno` | |
| `render.gno` | |
| `state.gno` | |
| `swap.gno` | |
| `token.gno` | |
| `types.gno` | |
| `upgrade.gno` | |
| `util.gno` | |
| `gnomod.toml` | optional; nếu gửi thì `module` = `gno.land/r/<agent-g1>/zdex/v2` |

Loại: `zdex_test.gno`, `amm_test.gno`.

## Packet trees

- `deploy/zdex-v2/` ← `gno.land/r/zdex/v2` (mọi `.gno` trừ `*_test.gno` + `gnomod.toml`)
- `deploy/p/zdex/amm/v1/` ← `gno.land/p/zdex/amm/v1` (không tests)

## Không làm

Không mnemonic. Không raw gnokey. Không addpkg. Không force-push.
