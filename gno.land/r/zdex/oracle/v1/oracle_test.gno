package oracle

import (
	"testing"

	"gno.land/p/nt/avl/v0"
	"gno.land/p/nt/testutils/v0"
	"gno.land/p/nt/uassert/v0"
	"gno.land/r/zdex/v2"
)

func resetOracle() {
	rings = avl.Tree{}
}

func seedPool(cur realm, t *testing.T, symbol string) string {
	t.Helper()
	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	id := zdex.Launch(cross(cur), symbol, symbol, 0, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)
	return id
}

func TestPingAndObserve(cur realm, t *testing.T) {
	resetOracle()
	id := seedPool(cur, t, "ORCA")
	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	px1 := Ping(cross(cur), id)
	uassert.True(t, px1 > 0, "spot")
	uassert.Equal(t, 1, SampleCount(id))
	testing.SkipHeights(10)
	px2 := Ping(cross(cur), id)
	uassert.True(t, px2 > 0, "spot2")
	uassert.Equal(t, 2, SampleCount(id))
	twap := Observe(id, 10)
	uassert.True(t, twap > 0, "twap")
	uassert.Equal(t, "1", Version())
}

func TestObserveThinPanics(cur realm, t *testing.T) {
	resetOracle()
	id := seedPool(cur, t, "ORCB")
	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	Ping(cross(cur), id)
	threw := false
	func() {
		defer func() {
			if recover() != nil {
				threw = true
			}
		}()
		Observe(id, 100)
	}()
	uassert.True(t, threw, "thin window")
}

func TestSameHeightOverwrite(cur realm, t *testing.T) {
	resetOracle()
	id := seedPool(cur, t, "ORCC")
	alice := testutils.TestAddress("alice")
	testing.SetRealm(testing.NewUserRealm(alice))
	Ping(cross(cur), id)
	Ping(cross(cur), id)
	uassert.Equal(t, 1, SampleCount(id))
}
