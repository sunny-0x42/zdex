package oracle

import (
	"testing"

	"gno.land/p/nt/avl/v0"
	"gno.land/p/nt/testutils/v0"
	"gno.land/p/nt/uassert/v0"
	"gno.land/r/zdex/v2"
)

func TestPingFiveMajorPairs(cur realm, t *testing.T) {
	rings = avl.Tree{}
	syms := []string{"oUSDC", "oUSDT", "oBTC", "oETH", "oATONE"}
	alice := testutils.TestAddress("alice")
	ids := make([]string, len(syms))
	for i, sym := range syms {
		testing.SetRealm(testing.NewUserRealm(alice))
		ids[i] = zdex.Launch(cross(cur), sym, sym, 6, 1_000_000_000, 0, 3_500_000_000, 0, 28800, 0, 200)
		testing.SetRealm(testing.NewUserRealm(alice))
		px := Ping(cross(cur), ids[i])
		uassert.True(t, px > 0, "ping "+sym)
		uassert.Equal(t, px, LastSpot(ids[i]))
	}
	testing.SkipHeights(20)
	for i, id := range ids {
		testing.SetRealm(testing.NewUserRealm(alice))
		Ping(cross(cur), id)
		twap := Observe(id, 20)
		uassert.True(t, twap > 0, "twap "+syms[i])
		uassert.Equal(t, 2, SampleCount(id))
	}
}
