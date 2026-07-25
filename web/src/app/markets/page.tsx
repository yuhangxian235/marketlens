import Link from "next/link";

import { EvidenceRail } from "@/components/evidence-rail";
import { StatusBadge } from "@/components/status-badge";
import { getManifest, getMarkets } from "@/lib/evidence";

export default async function MarketsPage() {
  const [manifest, markets] = await Promise.all([getManifest(), getMarkets()]);
  return (
    <div className="pageGrid">
      <EvidenceRail manifest={manifest} />
      <div className="pageCanvas">
        <header className="pageIntro">
          <div className="sectionLabel">Observed market ledger</div>
          <h1>Markets are not cards. They are evidence boundaries.</h1>
          <p>
            Each row ties a question to its exact contract, sample window, wallet
            participation, and reusable evidence definition.
          </p>
        </header>
        <div className="marketLedger">
          <div className="ledgerHeader" aria-hidden="true">
            <span>Market / resolution</span>
            <span>Activity</span>
            <span>Capital split</span>
            <span>Evidence</span>
          </div>
          {markets.map((market) => {
            const totalGwei = market.yesAmountGwei + market.noAmountGwei;
            const yesShare = totalGwei ? market.yesAmountGwei / totalGwei : 0;
            return (
              <article className="marketRow" key={market.marketId}>
                <div className="marketIdentity">
                  <span className="marketId">MKT / {market.marketId.padStart(2, "0")}</span>
                  <h2>{market.question}</h2>
                  <div className="badgeRow">
                    <StatusBadge tone={market.refundMode ? "warning" : "verified"}>
                      {market.refundMode
                        ? "ZERO-WINNER REFUND"
                        : `RESOLVED ${market.resolvedOutcome}`}
                    </StatusBadge>
                  </div>
                </div>
                <dl className="marketStats">
                  <div>
                    <dt>Trades</dt>
                    <dd>{market.tradeCount}</dd>
                  </div>
                  <div>
                    <dt>Wallets</dt>
                    <dd>{market.uniqueWallets}</dd>
                  </div>
                  <div>
                    <dt>First touch</dt>
                    <dd>{market.firstTouchWallets}</dd>
                  </div>
                  <div>
                    <dt>Volume</dt>
                    <dd>{market.totalAmountMon.toFixed(1)} MON</dd>
                  </div>
                </dl>
                <div className="capitalSplit">
                  <div className="splitLabels">
                    <span>YES {(yesShare * 100).toFixed(0)}%</span>
                    <span>NO {((1 - yesShare) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="splitBar">
                    <span style={{ width: `${yesShare * 100}%` }} />
                  </div>
                  <small>Exact source: aligned contribution gwei</small>
                </div>
                <div className="marketEvidenceLinks">
                  <Link href={`/evidence/market.${market.marketId}.trade_count`}>
                    Trace trades
                  </Link>
                  <Link href={`/evidence/market.${market.marketId}.unique_wallets`}>
                    Trace wallets
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

