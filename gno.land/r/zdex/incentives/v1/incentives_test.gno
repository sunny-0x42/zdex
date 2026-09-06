package incentives

import (
	"chain"
	"strings"
	"testing"

	"gno.land/p/nt/avl/v0"
	"gno.land/p/nt/testutils/v0"
	"gno.land/p/nt/uassert/v0"
	"gno.land/r/zdex/v2"
)

func resetAll() {
	paused = false
	gauges = avl.Tree{}
	stakes = avl.Tree{}
	admin = testutils.TestAddress("admin")
}

func fundPkgs(t *testing.T) {
	t.Helper()
	coins := chain.Coins{{Denom: nativeDenom, Amount: 10_000_000_000}}
	testing.IssueCoins(chain.PackageAddress("gno.land/r/zdex/v2"), coins)
	testing.IssueCoins(chain.PackageAddress("gno.land/r/zdex/incentives/v1"), coins)
}

func launchPool(cur realm, t *testing.T, symbol string) string {
	t.Helper()
	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{})
	id := zdex.Launch(cross(cur), symbol, symbol, 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)
	_, _, _, totalLP, _ := zdex.PoolInfo(id)
	uassert.True(t, totalLP > 0, "launch seed LP")
	return id
}

func addLP(cur realm, t *testing.T, id, symbol, who string, buyU, addU int64) (address, int64) {
	t.Helper()
	addr := testutils.TestAddress(who)
	testing.SetRealm(testing.NewUserRealm(addr))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: buyU}})
	tok := zdex.SwapExactIn(cross(cur), id, nativeDenom, buyU, 1, 0)
	uassert.True(t, tok > 0, "buy")
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: addU}})
	lp := zdex.AddLiquidity(cross(cur), id, addU, tok, 1)
	uassert.True(t, lp > 0, "lp")
	uassert.Equal(t, lp, zdex.PositionOf(id, addr))
	return addr, lp
}

func TestFundIncreasesAcc(cur realm, t *testing.T) {
	resetAll()
	fundPkgs(t)
	id := launchPool(cur, t, "INCF")
	_, _, _, totalLP, _ := zdex.PoolInfo(id)
	uassert.True(t, totalLP > 0, "totalLP")

	uassert.Equal(t, "1", Version())
	uassert.Equal(t, "gno.land/r/zdex/v2", DexPkg())
	uassert.True(t, Admin().IsValid(), "admin")
	uassert.True(t, strings.Contains(Render(""), "Fund"), "render")

	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	sent := int64(1_000_000)
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: sent}})
	Fund(cross(cur), id)

	parts := strings.Split(GaugeSnapshot(id), ";")
	uassert.Equal(t, 5, len(parts))
	uassert.Equal(t, id, parts[0])
	uassert.True(t, parts[1] != "0" && parts[1] != "", "acc increased")
	uassert.Equal(t, "1000000", parts[2])
	uassert.Equal(t, "1", parts[3])
	uassert.Equal(t, "0", parts[4])
	uassert.True(t, strings.Contains(GaugeList(), id), "listed")
}

func TestSyncLPHolderAndNewLPZero(cur realm, t *testing.T) {
	resetAll()
	fundPkgs(t)
	id := launchPool(cur, t, "INCS")

	testing.SkipHeights(28800)
	bob, lp := addLP(cur, t, id, "INCS", "bob", 2_000_000, 1000)
	uassert.True(t, lp > 0, "bob lp")

	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{})
	uassert.Equal(t, int64(0), Sync(cross(cur), id))
	uassert.Equal(t, int64(0), Claimable(id, bob))

	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	Fund(cross(cur), id)

	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{})
	want := Claimable(id, bob)
	uassert.True(t, want > 0, "bob claimable after fund")
	got := Claim(cross(cur), id)
	uassert.Equal(t, want, got)
	uassert.Equal(t, int64(0), Claimable(id, bob))

	carol, _ := addLP(cur, t, id, "INCS", "carol", 2_000_000, 1000)
	testing.SetRealm(testing.NewUserRealm(carol))
	testing.SetOriginSend(chain.Coins{})
	uassert.Equal(t, int64(0), Claimable(id, carol))
	uassert.Equal(t, int64(0), Sync(cross(cur), id))
}

func TestFundUnknownPoolPanics(cur realm, t *testing.T) {
	resetAll()
	fundPkgs(t)
	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	uassert.AbortsWithMessage(t, cur, "zdex: pool not found", func() {
		Fund(cross(cur), "ugnot|NOPE")
	})
}

func TestFundNonEOAPanics(cur realm, t *testing.T) {
	resetAll()
	fundPkgs(t)
	id := launchPool(cur, t, "INCE")
	testing.SetRealm(testing.NewCodeRealm("gno.land/r/attacker"))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	uassert.AbortsWithMessage(t, cur, "zdex: ugnot is EOA-only", func() {
		Fund(cross(cur), id)
	})
}

func TestPauseAndGaugeOff(cur realm, t *testing.T) {
	resetAll()
	fundPkgs(t)
	id := launchPool(cur, t, "INCP")
	adm := Admin()
	testing.SetRealm(testing.NewUserRealm(adm))
	testing.SetOriginSend(chain.Coins{})
	SetPaused(cross(cur), true)

	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	uassert.AbortsWithMessage(t, cur, "zdex: paused", func() {
		Fund(cross(cur), id)
	})

	testing.SetRealm(testing.NewUserRealm(adm))
	testing.SetOriginSend(chain.Coins{})
	SetPaused(cross(cur), false)
	SetGauge(cross(cur), id, false)
	uassert.True(t, strings.Contains(GaugeList(), id), "setgauge lists")

	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	uassert.AbortsWithMessage(t, cur, "zdex: gauge off", func() {
		Fund(cross(cur), id)
	})

	testing.SetOriginSend(chain.Coins{})
	uassert.Equal(t, int64(0), Claim(cross(cur), id))
}

func TestClaimAfterRemoveForfeits(cur realm, t *testing.T) {
	resetAll()
	fundPkgs(t)
	id := launchPool(cur, t, "INCR")
	testing.SkipHeights(28800)
	bob, lp := addLP(cur, t, id, "INCR", "bob", 2_000_000, 1000)
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{})
	uassert.Equal(t, int64(0), Sync(cross(cur), id))

	testing.SetOriginSend(chain.Coins{})
	zdex.RemoveLiquidity(cross(cur), id, lp, 1, 1)
	uassert.Equal(t, int64(0), zdex.PositionOf(id, bob))

	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	Fund(cross(cur), id)

	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{})
	uassert.Equal(t, int64(0), Claimable(id, bob))
	uassert.Equal(t, int64(0), Claim(cross(cur), id))
}
