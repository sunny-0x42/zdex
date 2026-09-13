package zdex

import (
	"chain"
	"strconv"
	"testing"

	"gno.land/p/nt/testutils/v0"
	"gno.land/p/nt/uassert/v0"
)

// Five GNOT pairs with test tickers — not mainnet BTC/ETH/USDC.
// 100 TestAddress wallets swap after the Launch snipe window.

var loadSyms = []string{"tUSDC", "tUSDT", "tBTC", "tETH", "tATONE"}

func TestLoadFivePairsHundredWallets(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 50_000_000_000)

	ids := make([]string, len(loadSyms))
	spot0 := make([]int64, len(loadSyms))
	for i, sym := range loadSyms {
		testing.SetRealm(testing.NewUserRealm(alice))
		testing.SetOriginSend(chain.Coins{})
		ids[i] = Launch(cross(cur), sym, sym, 6, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1000, 200)
		uassert.Equal(t, "ugnot|"+sym, ids[i])
		spot0[i] = SpotPrice(ids[i])
		uassert.True(t, spot0[i] > 0, "spot0 "+sym)
	}

	testing.SkipHeights(1001)

	const nWallets = 100
	const buyU = int64(500_000)
	ok, fail := 0, 0
	for w := 0; w < nWallets; w++ {
		who := testutils.TestAddress("w" + strconv.Itoa(w))
		testing.IssueCoins(who, chain.Coins{{Denom: nativeDenom, Amount: buyU * int64(len(loadSyms)) * 2}})
		testing.SetRealm(testing.NewUserRealm(who))
		for _, id := range ids {
			testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: buyU}})
			func() {
				defer func() {
					if recover() != nil {
						fail++
					}
				}()
				out := SwapExactIn(cross(cur), id, nativeDenom, buyU, 1, 0)
				if out <= 0 {
					fail++
					return
				}
				ok++
			}()
		}
	}

	uassert.True(t, ok >= nWallets*len(loadSyms)*8/10, "most swaps ok")
	uassert.Equal(t, 5, PoolCount())

	moved := 0
	prot := int64(0)
	for i, id := range ids {
		ru, rt, _, _, fee := PoolInfo(id)
		uassert.True(t, ru > 0, "reserveU "+loadSyms[i])
		uassert.True(t, rt > 0, "reserveT "+loadSyms[i])
		uassert.Equal(t, launchFeeBps, fee)
		if SpotPrice(id) != spot0[i] {
			moved++
		}
		p := getPool(id)
		prot = add64(prot, p.AccruedProtocolU)
		uassert.True(t, p.AccruedProtocolU > 0 || p.AccruedCreatorU > 0, "fees "+loadSyms[i])
	}
	uassert.True(t, moved >= 1, "spot moved")
	uassert.True(t, prot > 0, "protocol ugnot accrued")
	uassert.True(t, fail < ok, "fails < oks")
}
