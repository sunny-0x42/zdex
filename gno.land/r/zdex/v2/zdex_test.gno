package zdex

import (
	"chain"
	"strings"
	"testing"

	"gno.land/p/nt/avl/v0"
	"gno.land/p/nt/testutils/v0"
	"gno.land/p/nt/uassert/v0"
)

func resetAll() {
	paused = false
	pools = avl.Tree{}
	pos = avl.Tree{}
	orders = avl.Tree{}
	vests = avl.Tree{}
	tokens = avl.Tree{}
	scores = avl.Tree{}
	modules = avl.Tree{}
	nextPkg = ""
	nextOrd = 0
	nextTok = 0
	epoch = 0
	epochEnd = 0
	epochPts = 0
	epochPot = 0
	epochBlocks = defaultEpochBlocks
	feeShareBps = defaultFeeShareBps
	closedID = 0
	closedPts = 0
	closedPot = 0
	var z address
	admin = z
	pendingAdmin = z
}

func fundRealm(t *testing.T, ugnot int64) {
	t.Helper()
	testing.IssueCoins(chain.PackageAddress("gno.land/r/zdex/v2"), chain.Coins{{Denom: nativeDenom, Amount: ugnot}})
}

func TestMulDivAndSqrt(t *testing.T) {
	uassert.Equal(t, int64(6), MulDiv(3, 4, 2))
	uassert.Equal(t, int64(0), MulDiv(0, 5, 2))
	uassert.Equal(t, int64(10), Sqrt(100))
	uassert.Equal(t, int64(1), Sqrt(1))
	uassert.Equal(t, int64(0), Sqrt(0))
	uassert.Equal(t, int64(1_000_000_000_000), MulDiv(1_000_000_000_000, 1_000_000_000_000, 1_000_000_000_000))
	a18 := int64(1_000_000_000_000_000_000)
	uassert.Equal(t, a18-2, MulDiv(a18-1, a18-1, a18))
	uassert.Equal(t, int64(8_999_999_999_899_999_991), MulDiv(a18-1, 89_999_999_999, 10_000_000_000))
	uassert.Equal(t, a18-1, MulDivCeil(a18-1, a18-1, a18))
}

func TestAmountOutFee(t *testing.T) {
	out := AmountOut(1000, 100_000, 0, 100_000, 0, 30)
	uassert.True(t, out > 0 && out < 1000, "out in range")
	out2 := AmountOut(1000, 0, 100_000, 100_000, 0, 30)
	uassert.True(t, out2 > 0, "virtual in works")
}

func TestLaunchBuySell(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))

	id := Launch(cross(cur), "Demo", "DEMO", 0, 1_000_000_000, 1000, 3_500_000_000, 28800, 28800, 1000, 200)
	uassert.Equal(t, "ugnot|DEMO", id)
	uassert.Equal(t, 1, PoolCount())
	ru, rt, vu, _, fee := PoolInfo(id)
	uassert.Equal(t, int64(0), ru)
	uassert.Equal(t, int64(900_000_000), rt)
	uassert.Equal(t, int64(3_500_000_000), vu)
	uassert.Equal(t, launchFeeBps, fee)
	uassert.Equal(t, int64(0), BalanceOf("DEMO", alice))
	tot, claimed, rel := VestingOf("DEMO", alice)
	uassert.Equal(t, int64(100_000_000), tot)
	uassert.Equal(t, int64(0), claimed)
	uassert.Equal(t, int64(0), rel)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	buyIn := int64(1_000_000)
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: buyIn}})
	out := SwapExactIn(cross(cur), id, nativeDenom, buyIn, 1, 0)
	uassert.True(t, out > 0, "bought tokens")
	uassert.Equal(t, out, BalanceOf("DEMO", bob))

	ru, rt, _, _, _ = PoolInfo(id)
	uassert.True(t, ru > 0, "real ugnot in pool")
	uassert.Equal(t, int64(900_000_000)-out, rt)

	half := out / 2
	testing.SetOriginSend(chain.Coins{})
	got := SwapExactIn(cross(cur), id, "DEMO", half, 1, 0)
	uassert.True(t, got > 0, "sold for ugnot")
	uassert.Equal(t, out-half, BalanceOf("DEMO", bob))
}

func TestSnipeCap(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Snipe", "SNP", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1000, 1)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000_000}})
	uassert.AbortsWithMessage(t, cur, "zdex: snipe cap", func() {
		SwapExactIn(cross(cur), id, nativeDenom, 1_000_000_000, 1, 0)
	})
}

func TestSlippageAndDeadline(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Slip", "SLP", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	uassert.AbortsWithMessage(t, cur, "zdex: slippage", func() {
		SwapExactIn(cross(cur), id, nativeDenom, 1000, 1_000_000_000, 0)
	})

	testing.SkipHeights(10)
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	uassert.AbortsWithMessage(t, cur, "zdex: expired", func() {
		SwapExactIn(cross(cur), id, nativeDenom, 1000, 1, 5)
	})
}

func TestPaymentGuardRejectsRealm(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Pay", "PAY", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)

	testing.SetRealm(testing.NewCodeRealm("gno.land/r/attacker"))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	uassert.AbortsWithMessage(t, cur, "zdex: ugnot swap is EOA-only", func() {
		SwapExactIn(cross(cur), id, nativeDenom, 1000, 1, 0)
	})
}

func TestVestingReleases(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	Launch(cross(cur), "Vest", "VST", 0, 1_000_000_000, 1000, 3_500_000_000, 28800, 28800, 0, 200)

	uassert.AbortsWithMessage(t, cur, "zdex: nothing to claim", func() {
		ClaimVest(cross(cur), "VST")
	})

	testing.SkipHeights(14400)
	got := ClaimVest(cross(cur), "VST")
	uassert.True(t, got > 0, "partial vest")
	uassert.Equal(t, got, BalanceOf("VST", alice))

	testing.SkipHeights(20000)
	got2 := ClaimVest(cross(cur), "VST")
	uassert.True(t, got2 > 0, "rest of vest")
	uassert.Equal(t, int64(100_000_000), BalanceOf("VST", alice))
}

func TestLimitOrderBidFill(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Book", "BOK", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 5_000_000}})
	tok := SwapExactIn(cross(cur), id, nativeDenom, 5_000_000, 1, 0)
	uassert.True(t, tok > 10, "bob has tokens")

	carol := testutils.TestAddress("carol")
	testing.SetRealm(testing.NewUserRealm(carol))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	oid := PlaceBid(cross(cur), id, 1000, 10, 0, false)
	uassert.True(t, oid > 0, "order id")
	uassert.Equal(t, 1, OrderCount())

	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{})
	paid, received := FillOrder(cross(cur), oid, 10)
	uassert.Equal(t, int64(10), paid)
	uassert.Equal(t, int64(1000), received)
	uassert.Equal(t, 0, OrderCount())
	uassert.Equal(t, int64(10), BalanceOf("BOK", carol))
}

func TestPause(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	testing.SetRealm(testing.NewUserRealm(alice))
	SetPaused(cross(cur), true)
	uassert.True(t, Paused(), "paused")
	uassert.AbortsWithMessage(t, cur, "zdex: paused", func() {
		Launch(cross(cur), "X", "XXX", 0, 1_000_000_000, 0, 1000, 0, 28800, 0, 200)
	})
	SetPaused(cross(cur), false)
	uassert.False(t, Paused(), "unpaused")
}

func TestRenderHome(t *testing.T) {
	resetAll()
	out := Render("")
	uassert.True(t, len(out) > 20, "render")
	uassert.True(t, strings.Contains(out, "None yet. Create a two-sided pool."), "empty copy")
	uassert.False(t, strings.Contains(out, "Launch a coin below"), "no launch copy")
}

func TestPoolListSnapshot(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Snap", "SNAP", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1000, 200)
	uassert.Equal(t, "ugnot|SNAP", PoolList())
	snap := PoolSnapshot(id)
	uassert.True(t, len(snap) > 10, "snapshot")
	uassert.True(t, Height() >= 0, "height")
}

func TestAmountInInverse(t *testing.T) {
	out := int64(1000)
	in := AmountIn(out, 100_000, 0, 100_000, 0, 30)
	got := AmountOut(in, 100_000, 0, 100_000, 0, 30)
	uassert.True(t, got >= out, "exact-out covers")
}

func TestLaunchLPAndAdd(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "LP", "LPT", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)
	_, _, _, totalLP, _ := PoolInfo(id)
	uassert.True(t, totalLP > minLiquidity, "seed LP burned")
	uassert.Equal(t, int64(0), PositionOf(id, alice))

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 2_000_000}})
	tok := SwapExactIn(cross(cur), id, nativeDenom, 2_000_000, 1, 0)
	uassert.True(t, tok > 0, "buy")

	testing.SkipHeights(28800)
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	lp := AddLiquidity(cross(cur), id, 1000, tok, 1)
	uassert.True(t, lp > 0, "added LP")
	uassert.Equal(t, lp, PositionOf(id, bob))
}

func TestFeeBucketsIndependent(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Fee", "FEE", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 1_000_000, 1, 0)

	p := getPool(id)
	uassert.True(t, p.AccruedCreatorU > 0, "creator ugnot fee")
	uassert.True(t, p.AccruedProtocolU > 0, "protocol ugnot fee")
	creatorFee := p.AccruedCreatorU
	protoFee := p.AccruedProtocolU

	testing.SetRealm(testing.NewUserRealm(alice))
	testing.SetOriginSend(chain.Coins{})
	SetPaused(cross(cur), true)
	u, _ := CollectFees(cross(cur), id)
	uassert.Equal(t, creatorFee+protoFee, u)

	p = getPool(id)
	uassert.Equal(t, int64(0), p.AccruedCreatorU)
	uassert.Equal(t, int64(0), p.AccruedProtocolU)
	SetPaused(cross(cur), false)
}

func TestSellDuringSnipe(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "SnS", "SNS", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1000, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	tok := SwapExactIn(cross(cur), id, nativeDenom, 1_000_000, 1, 0)
	testing.SetOriginSend(chain.Coins{})
	got := SwapExactIn(cross(cur), id, "SNS", tok/100, 1, 0)
	uassert.True(t, got > 0, "small sell during snipe")
}

func TestSwapExactOut(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Xo", "XOUT", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)

	want := int64(1000)
	need := QuoteIn(id, "XOUT", want)
	uassert.True(t, need > 0, "quote in")

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: need + 50}})
	paid := SwapExactOut(cross(cur), id, "XOUT", want, need+50, 0)
	uassert.Equal(t, need, paid)
	uassert.Equal(t, want, BalanceOf("XOUT", bob))
}

func TestGraduate(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Grad", "GRD", 0, 1_000_000, 0, 50_000, 0, 28800, 1, 200)
	_, _, vu, _, _ := PoolInfo(id)
	uassert.Equal(t, int64(50_000), vu)

	testing.SkipHeights(2)
	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 80_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 80_000, 1, 0)
	_, _, vu, _, _ = PoolInfo(id)
	uassert.Equal(t, int64(0), vu)
	uassert.True(t, SpotPrice(id) > 0, "spot")
}

func TestAdminTwoStep(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	bob := testutils.TestAddress("bob")
	admin = alice
	testing.SetRealm(testing.NewUserRealm(alice))
	ProposeAdmin(cross(cur), bob)
	uassert.Equal(t, bob, PendingAdmin())
	uassert.Equal(t, alice, Admin())
	testing.SetRealm(testing.NewUserRealm(bob))
	AcceptAdmin(cross(cur))
	uassert.Equal(t, bob, Admin())
}

func TestPointsFeeShareNoStake(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	SetEpochBlocks(cross(cur), 100000)
	id := Launch(cross(cur), "Pts", "PTS", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 2_000_000}})
	tok := SwapExactIn(cross(cur), id, nativeDenom, 2_000_000, 1, 0)
	uassert.True(t, tok > 0, "buy")
	life, ep, _ := PointsOf(bob)
	uassert.Equal(t, int64(2_000_000), life)
	uassert.Equal(t, int64(2_000_000), ep)
	_, _, pot, pts, _, _, _ := EpochInfo()
	uassert.True(t, pot > 0, "protocol ugnot in pot")
	uassert.True(t, pts >= 2_000_000, "epoch points")

	testing.SkipHeights(28802)
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	lp := AddLiquidity(cross(cur), id, 1000, tok, 1)
	uassert.True(t, lp > 0, "lp without extra stake")

	carol := testutils.TestAddress("carol")
	testing.SetRealm(testing.NewUserRealm(carol))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1_000_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 1_000_000, 1, 0)

	testing.SetRealm(testing.NewUserRealm(bob))
	gotLP := HarvestPoints(cross(cur), id)
	uassert.True(t, gotLP > 0, "LP points from holding, no farm stake")

	testing.SetRealm(testing.NewUserRealm(alice))
	SetEpochBlocks(cross(cur), 10)
	testing.SkipHeights(15)
	testing.SetRealm(testing.NewUserRealm(bob))
	share := ClaimFeeShare(cross(cur))
	uassert.True(t, share > 0, "claimed protocol fee share")
	uassert.Equal(t, int64(0), ClaimableFeeShare(bob))
}

func TestUpgradeHub(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	bob := testutils.TestAddress("bob")
	admin = alice
	testing.SetRealm(testing.NewUserRealm(alice))

	uassert.Equal(t, "2", Version())
	uassert.Equal(t, defaultCaps, Caps())
	uassert.Equal(t, "", NextPkg())
	uassert.Equal(t, thisPkg(), ModuleOf("swap"))
	uassert.Equal(t, thisPkg(), ModuleOf("lp"))
	uassert.Equal(t, thisPkg(), ModuleOf("points"))
	hub := HubSnapshot()
	uassert.True(t, len(hub) > 0, "hub snapshot")
	uassert.True(t, Modules() != "", "modules listing")

	SetNextPkg(cross(cur), "gno.land/r/zdex/v3")
	uassert.Equal(t, "gno.land/r/zdex/v3", NextPkg())
	SetModule(cross(cur), "book", "gno.land/r/zdex/book/v3")
	uassert.Equal(t, "gno.land/r/zdex/book/v3", ModuleOf("book"))
	uassert.Equal(t, thisPkg(), ModuleOf("swap"))
	SetModule(cross(cur), "book", "")
	uassert.Equal(t, thisPkg(), ModuleOf("book"))

	testing.SetRealm(testing.NewUserRealm(bob))
	uassert.AbortsWithMessage(t, cur, "zdex: admin only", func() {
		SetNextPkg(cross(cur), "gno.land/r/evil")
	})
	uassert.AbortsWithMessage(t, cur, "zdex: admin only", func() {
		SetModule(cross(cur), "swap", "gno.land/r/evil")
	})
}

func TestLookupTokenCatalog(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Lookup", "LKP", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1, 200)
	got := LookupToken("LKP")
	uassert.True(t, len(got) > 0, "lookup by symbol")
	byPool := LookupToken(id)
	uassert.True(t, len(byPool) > 0, "lookup by pool id")
	cat := TokenCatalog()
	uassert.True(t, len(cat) > 0, "catalog includes launched token")
	uassert.Equal(t, "", LookupToken("nope"))
}

func TestFillOrderDustAndXorRefund(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	id := Launch(cross(cur), "Dust", "DST", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 5_000_000}})
	tok := SwapExactIn(cross(cur), id, nativeDenom, 5_000_000, 1, 0)
	uassert.True(t, tok > 50, "bob has tokens")

	carol := testutils.TestAddress("carol")
	testing.SetRealm(testing.NewUserRealm(carol))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	oid := PlaceBid(cross(cur), id, 1000, 1_000_000, 0, false)

	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{})
	uassert.AbortsWithMessage(t, cur, "zdex: dust", func() {
		FillOrder(cross(cur), oid, 1)
	})
	uassert.Equal(t, 1, OrderCount())

	testing.SetRealm(testing.NewUserRealm(carol))
	CancelOrder(cross(cur), oid)
	uassert.Equal(t, 0, OrderCount())

	testing.SetRealm(testing.NewUserRealm(bob))
	askID := PlaceAsk(cross(cur), id, 50, 5_000, 0, false)
	o := getOrder(askID)
	o.WantAmt = 0
	before := BalanceOf("DST", bob)
	settleFillForTest(cross(cur), askID)
	uassert.Equal(t, 0, OrderCount())
	uassert.Equal(t, before+50, BalanceOf("DST", bob))
}

func settleFillForTest(cur realm, orderID uint64) {
	o := getOrder(orderID)
	settleFill(0, cur, o, getPool(o.PoolID))
}

func TestClaimFeeSharePausedSubtract(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	SetEpochBlocks(cross(cur), 10)
	id := Launch(cross(cur), "Pot", "POT", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 2_000_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 2_000_000, 1, 0)
	_, _, pot1, _, _, _, _ := EpochInfo()
	uassert.True(t, pot1 > 0, "epoch pot")

	testing.SkipHeights(15)
	carol := testutils.TestAddress("carol")
	testing.SetRealm(testing.NewUserRealm(carol))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 1000}})
	SwapExactIn(cross(cur), id, nativeDenom, 1000, 1, 0)
	_, _, _, _, cID, cPot, _ := EpochInfo()
	uassert.True(t, cID > 0, "closed epoch")
	uassert.Equal(t, pot1, cPot)

	testing.SetRealm(testing.NewUserRealm(alice))
	SetPaused(cross(cur), true)
	testing.SetRealm(testing.NewUserRealm(bob))
	share := ClaimFeeShare(cross(cur))
	uassert.True(t, share > 0, "claim while paused")
	_, _, _, _, _, cPotAfter, _ := EpochInfo()
	uassert.Equal(t, pot1-share, cPotAfter)
	uassert.Equal(t, int64(0), ClaimableFeeShare(bob))
}

func TestEpochPotCarryUnclaimed(cur realm, t *testing.T) {
	resetAll()
	alice := testutils.TestAddress("alice")
	admin = alice
	fundRealm(t, 10_000_000_000)
	testing.SetRealm(testing.NewUserRealm(alice))
	SetEpochBlocks(cross(cur), 10)
	id := Launch(cross(cur), "Cry", "CRY", 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 1, 200)

	bob := testutils.TestAddress("bob")
	testing.SetRealm(testing.NewUserRealm(bob))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 2_000_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 2_000_000, 1, 0)
	_, _, pot1, _, _, _, _ := EpochInfo()
	uassert.True(t, pot1 > 0, "epoch pot")

	testing.SkipHeights(15)
	carol := testutils.TestAddress("carol")
	testing.SetRealm(testing.NewUserRealm(carol))
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 2_000_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 2_000_000, 1, 0)
	_, _, _, _, _, cPot, _ := EpochInfo()
	uassert.Equal(t, pot1, cPot)

	testing.SkipHeights(15)
	testing.SetOriginSend(chain.Coins{{Denom: nativeDenom, Amount: 2_000_000}})
	SwapExactIn(cross(cur), id, nativeDenom, 2_000_000, 1, 0)
	_, _, newPot, _, _, newClosed, _ := EpochInfo()
	uassert.True(t, newPot >= pot1, "unclaimed closedPot carried into new epoch")
	uassert.True(t, newClosed > 0, "last closed snapshot still claimable")
	got := ClaimFeeShare(cross(cur))
	uassert.True(t, got > 0, "claim last closed epoch")
}
