import { useDex } from "../context";

const SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "how", title: "How it works" },
  { id: "fees", title: "Fees" },
  { id: "compare", title: "Uniswap and GnoSwap" },
  { id: "upgrade", title: "Upgrades" },
  { id: "safety", title: "Safety" },
];

export default function Docs() {
  const { setTab, d, live, net } = useDex();
  return (
    <section className="docs">
      <aside className="docs-toc" aria-label="On this page">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#docs-${s.id}`}>
            {s.title}
          </a>
        ))}
      </aside>
      <article className="docs-body">
        <header className="docs-hero">
          <p className="docs-kicker">zdex documentation</p>
          <h1>A Gno-native DEX</h1>
          <p>
            zdex is a non-custodial exchange on Gno.land. The product UI follows the latest Uniswap web patterns (centered swap, exact-out, token picker). The protocol is Uniswap v2-shaped on Gno primitives — not an EVM port and not Uniswap v4 hooks.
          </p>
        </header>

        <section id="docs-overview">
          <h2>Overview</h2>
          <p>
            Quote asset is native GNOT. Swaps attach <code>ugnot</code> with OriginSend. There is no wrap and no wugnot. Listing is CreatePool: two-sided GNOT + an existing GRC20, minimum 1 GNOT. zdex does not issue the listed ticker. DEX-only — not a launchpad.
          </p>
          <p>
            Live public UI: <a href="https://zdex-gno.netlify.app">zdex-gno.netlify.app</a>. Default public net is Pearl testnet. Local gnodev is <code>{net.chainName}</code> (chain {live.chainId || net.chainId}).
          </p>
          <div className="docs-cards">
            <button type="button" className="docs-card" onClick={() => setTab("swap")}>
              <b>Trade</b>
              <span>SwapExactIn / SwapExactOut against a GNOT pool.</span>
            </button>
            <button type="button" className="docs-card" onClick={() => setTab("liq")}>
              <b>Liquidity</b>
              <span>No-stake LP. Fees stay in the pool. Hold LP to earn.</span>
            </button>
            <button type="button" className="docs-card" onClick={() => setTab("book")}>
              <b>Orders</b>
              <span>On-chain escrow bids and asks in the same v2 package.</span>
            </button>
          </div>
        </section>

        <section id="docs-how">
          <h2>How it works</h2>
          <ol className="docs-steps">
            <li>
              <b>Connect Adena.</b> You sign every write. zdex never holds keys. Keplr does not support Gno MsgCall.
            </li>
            <li>
              <b>CreatePool</b> lists a GRC20 against GNOT. External tokens: Approve the DEX realm on the TOKEN package, spender = RealmAddr, then create.
            </li>
            <li>
              <b>Swap</b> GNOT-in sends ugnot with the tx. Token-in pulls GRC20 after Approve. Exact out calls SwapExactOut with a max-in cap; excess GNOT is refunded.
            </li>
            <li>
              <b>Add liquidity</b> at the current ratio. Remove by shares. Removing LP forfeits unclaimed gauge on that pool.
            </li>
            <li>
              <b>Limit orders</b> lock GNOT (bid) or token (ask). Fill does not pay the AMM swap fee or accrue points.
            </li>
          </ol>
        </section>

        <section id="docs-fees">
          <h2>Fees</h2>
          <p>Interface fee is zero. Numbers below are the local schedule. Pearl pools already created keep the tier they listed with.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Who pays / who gets</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Swap tier</td>
                  <td>0.01 / 0.05 / 0.30 / 1.00%</td>
                  <td>Trader. Chosen per pool at CreatePool.</td>
                </tr>
                <tr>
                  <td>LP share of swap fee</td>
                  <td>~5/6 (8333/10000)</td>
                  <td>Stays in pool reserves. No extra stake.</td>
                </tr>
                <tr>
                  <td>Protocol share of swap fee</td>
                  <td>~1/6 (1667/10000)</td>
                  <td>Skim. 80% of protocol ugnot (buy side) → epoch pot.</td>
                </tr>
                <tr>
                  <td>CreatePool listing</td>
                  <td>0 extra token fee</td>
                  <td>Seed ≥ 1 GNOT + matching token. No 100 GNS fee.</td>
                </tr>
                <tr>
                  <td>Limit fill</td>
                  <td>0 AMM fee</td>
                  <td>Escrow, not the CPMM.</td>
                </tr>
                <tr>
                  <td>FundProgram / Ping</td>
                  <td>0 protocol cut</td>
                  <td>Sidecars. OriginSend is the program budget only.</td>
                </tr>
                <tr>
                  <td>Remove LP</td>
                  <td>0 withdrawal fee</td>
                  <td>Unlike GnoSwap 1% on collected fees.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="hint">
            Fee APR in the UI is a 24h estimate from recent volume, not a promised return. {d.nfaPearl}
          </p>
        </section>

        <section id="docs-compare">
          <h2>Uniswap and GnoSwap</h2>
          <p>
            Uniswap v2 is the economic inspiration: constant product, full-range LP shares, protocol about one-sixth of the fee. Uniswap v3/v4 concentrated liquidity and v4 hooks are not this package. Gno already has a Uniswap v3-style DEX (GnoSwap: ticks, NFT positions, wugnot, GNS, launchpad). zdex does not copy that onto the live v2 pool.
          </p>
          <ul>
            <li>zdex quotes native ugnot. Uniswap wraps ETH. GnoSwap wraps GNOT to wugnot for GRC-20 pools.</li>
            <li>zdex listing is CreatePool, DEX-only. GnoSwap also has a launchpad and a 100 GNS pool-creation fee.</li>
            <li>zdex escrow book lives in the same v2 realm. Uniswap and GnoSwap core AMMs do not.</li>
            <li>Farms are sidecars. Swap and LP stay on v2 when incentives upgrade.</li>
          </ul>
          <p>Do not read this as Uniswap-equivalent, Uniswap v3, or “the first DEX on Gno.”</p>
        </section>

        <section id="docs-upgrade">
          <h2>Upgrades</h2>
          <p>
            Packages are immutable. A new surface is a new path (incentives/v3, v4, oracle/v1). Hub Version / Caps / NextPkg / Modules point the UI. NextPkg on live Pearl v2 is empty. Liquidity on ugnot|ZDEX stays on v2.
          </p>
        </section>

        <section id="docs-safety">
          <h2>Safety</h2>
          <p>{d.guide.safety}</p>
          <p>{d.nfaPearl}</p>
        </section>
      </article>
    </section>
  );
}
