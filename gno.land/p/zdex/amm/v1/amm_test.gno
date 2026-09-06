package amm

import (
	"testing"

	"gno.land/p/nt/uassert/v0"
)

func TestMulDivAndSqrt(t *testing.T) {
	uassert.Equal(t, int64(6), MulDiv(3, 4, 2))
	uassert.Equal(t, int64(0), MulDiv(0, 5, 2))
	uassert.Equal(t, int64(10), Sqrt(100))
	uassert.Equal(t, int64(1), Sqrt(1))
	uassert.Equal(t, int64(0), Sqrt(0))
	uassert.Equal(t, int64(1_000_000_000_000), MulDiv(1_000_000_000_000, 1_000_000_000_000, 1_000_000_000_000))
}

func TestMulDivRemainderOverflow(t *testing.T) {
	// a0*b0 overflows int64; floor(a*b/d) still fits.
	a18 := int64(1_000_000_000_000_000_000)
	uassert.Equal(t, a18-2, MulDiv(a18-1, a18-1, a18))
	// a,b near 1e18, d near 1e10 — a0*b0 overflows, quotient fits.
	uassert.Equal(t, int64(8_999_999_999_899_999_991), MulDiv(a18-1, 89_999_999_999, 10_000_000_000))
}

func TestMulDivCeilRemainder(t *testing.T) {
	uassert.Equal(t, int64(3), MulDivCeil(6, 2, 4)) // exact
	uassert.Equal(t, int64(3), MulDivCeil(3, 3, 4)) // remainder != 0
	a18 := int64(1_000_000_000_000_000_000)
	uassert.Equal(t, a18-1, MulDivCeil(a18-1, a18-1, a18))
	uassert.Equal(t, int64(8_999_999_999_899_999_992), MulDivCeil(a18-1, 89_999_999_999, 10_000_000_000))
}

func TestMulDivOverflowResult(t *testing.T) {
	var r any
	func() {
		defer func() { r = recover() }()
		_ = MulDiv(1_000_000_000_000_000_000, 1_000_000_000_000_000_000, 10_000_000_000)
	}()
	uassert.True(t, r != nil, "quotient must not fit")
}

func TestAmountOutFee(t *testing.T) {
	out := AmountOut(1000, 100_000, 0, 100_000, 0, 30)
	uassert.True(t, out > 0 && out < 1000, "out in range")
	out2 := AmountOut(1000, 0, 100_000, 100_000, 0, 30)
	uassert.True(t, out2 > 0, "virtual in works")
}

func TestAmountInRoundTrip(t *testing.T) {
	want := int64(1000)
	in := AmountIn(want, 100_000, 0, 100_000, 0, 30)
	got := AmountOut(in, 100_000, 0, 100_000, 0, 30)
	uassert.True(t, got >= want, "exact-out does not underpay")
}
