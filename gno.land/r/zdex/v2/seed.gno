package zdex

import (
	"chain"
	"chain/runtime"
)

// SeedListedPool mints an internal GRC20 to the caller and opens a two-sided
// ugnot pool at the given reserves. Local gnodev only (chain-id "dev").
// Demo tickers are not mainnet BTC/ETH/USDC.
func SeedListedPool(cur realm, name, symbol string, decimals, amountU, amountT, feeBps int64) string {
	require(runtime.ChainID() == "dev", "zdex: seed local only")
	assertNotPaused()
	require(cur.Previous().IsUserCall(), "zdex: EOA only")
	require(amountU >= minListUgnot && amountT > 0, "zdex: amounts")
	if feeBps == 0 {
		feeBps = defaultFeeBps
	}
	require(validSwapFee(feeBps), "zdex: fee tier 1/5/30/100")
	require(symbol != "", "zdex: symbol")
	id := poolIDFor(symbol)
	require(tryPool(id) == nil, "zdex: pool exists")

	caller := cur.Previous().Address()
	takeUgnot(cur, amountU)
	if tryTok(symbol) == nil {
		mintInternal(cur, name, symbol, decimals, amountT, caller)
	} else {
		rec := getTok(symbol)
		checkErr(rec.ledger.Mint(caller, amountT))
	}
	pullUserToken(0, cur, symbol, caller, amountT)

	lp := geoMean(amountU, amountT)
	require(lp > minLiquidity, "zdex: tiny LP")
	p := &Pool{
		ID:          id,
		Token:       symbol,
		Symbol:      symbol,
		Name:        name,
		ReserveU:    amountU,
		ReserveT:    amountT,
		TotalLP:     lp,
		FeeBps:      feeBps,
		Creator:     caller,
		ProtocolBps: poolProtocolFeeBps,
		Internal:    true,
	}
	pools.Set(id, p)
	setPos(id, caller, lp-minLiquidity)
	chain.Emit("CreatePool", "pool", id, "lp", itoa(lp-minLiquidity), "creator", caller.String())
	return id
}
