import Link from "next/link";

import { EvidenceRail } from "@/components/evidence-rail";
import {
  getAnalytics,
  getManifest,
  getMarkets,
  percent,
} from "@/lib/evidence";

export default async function ProductAnalyticsPage() {
  const [manifest, analytics, markets] = await Promise.all([
    getManifest(),
    getAnalytics(),
    getMarkets(),
  ]);
  const returnedShare = analytics.allWallets
    ? analytics.returnedLaterWallets / analytics.allWallets
    : null;
  const topFirstTouchMarket = markets.reduce<(typeof markets)[number] | undefined>(
    (current, market) =>
      !current || market.firstTouchWallets > current.firstTouchWallets
        ? market
        : current,
    undefined,
  );
  return (
    <div className="pageGrid">
      <EvidenceRail manifest={manifest} />
      <div className="pageCanvas">
        <header className="pageIntro pageIntroSplit">
          <div>
            <div className="sectionLabel">Address-level behavior</div>
            <h1>Acquisition, return, and discovery—kept semantically separate.</h1>
          </div>
          <p>
            These are deterministic local-fork fixtures. Use them to inspect the method,
            not to infer production demand.
          </p>
        </header>
        <section className="metricTape" aria-label="Product metrics">
          <article>
            <span>First-seen-in-sample wallets</span>
            <strong>{analytics.allWallets}</strong>
            <Link href="/evidence/global.unique_wallets">Open evidence</Link>
          </article>
          <article>
            <span>Returned later in sample</span>
            <strong>{percent(returnedShare)}</strong>
            <small>{analytics.returnedLaterWallets} of {analytics.allWallets} wallets</small>
          </article>
          <article>
            <span>D1 repeat · eligible only</span>
            <strong>{percent(analytics.d1RepeatRate)}</strong>
            <Link href="/evidence/global.d1_repeat_rate">Open evidence</Link>
          </article>
          <article>
            <span>Joined multiple markets</span>
            <strong>{percent(analytics.multiMarketShare)}</strong>
            <Link href="/evidence/global.multi_market_share">Open evidence</Link>
          </article>
        </section>
        <section className="analyticsColumns">
          <article className="analysisPanel">
            <div className="panelHeading">
              <div>
                <div className="sectionLabel">First-touch distribution</div>
                <h2>Which question opened the sample journey?</h2>
              </div>
              <span>{analytics.allWallets} wallets</span>
            </div>
            <div className="barList">
              {markets.map((market) => (
                <div className="barRow" key={market.marketId}>
                  <div>
                    <span>M{market.marketId}</span>
                    <strong>{market.question}</strong>
                  </div>
                  <div className="barTrack">
                    <span
                      style={{
                        width: `${(market.firstTouchWallets / analytics.allWallets) * 100}%`,
                      }}
                    />
                  </div>
                  <b>{market.firstTouchWallets}</b>
                </div>
              ))}
            </div>
          </article>
          <article className="analysisPanel findingPanel">
            <div className="sectionLabel">Finding contract</div>
            <div className="findingLayer">
              <span>Fact</span>
              <p>
                {topFirstTouchMarket
                  ? `Market ${topFirstTouchMarket.marketId} has the most first-touch wallets in this fixture; `
                  : "No first-touch market is available; "}
                {analytics.multiMarketWallets} of {analytics.allWallets} wallets join at
                least two markets.
              </p>
            </div>
            <div className="findingLayer">
              <span>Interpretation</span>
              <p>
                The sample demonstrates how cross-market discovery can be measured
                without calling addresses “users.”
              </p>
            </div>
            <div className="findingLayer">
              <span>Hypothesis to validate</span>
              <p>
                A related-market module may increase qualified continuation after a
                first purchase.
              </p>
            </div>
          </article>
        </section>
        <p className="semanticNote">
          {analytics.semantics.firstSeen}. {analytics.semantics.repeat}.
        </p>
      </div>
    </div>
  );
}
