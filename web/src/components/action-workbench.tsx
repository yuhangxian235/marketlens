"use client";

import { useState } from "react";

import type { Outcome } from "@marketlens/prediction-market-actions";
import type { MarketSummary } from "@/lib/evidence";
import { previewBuy } from "@/lib/action-client";
import { StatusBadge } from "./status-badge";

const defaultSender = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

function stringify(value: unknown): string {
  return JSON.stringify(
    value,
    (_, item: unknown) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

export function ActionWorkbench({
  contractAddress,
  markets,
}: {
  contractAddress: `0x${string}`;
  markets: MarketSummary[];
}) {
  const [marketId, setMarketId] = useState(markets[0]?.marketId ?? "1");
  const [sender, setSender] = useState(defaultSender);
  const [outcome, setOutcome] = useState<Outcome>("YES");
  const [payment, setPayment] = useState("1");
  const [maximum, setMaximum] = useState("1.5");
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewBuy>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buildPreview() {
    setError(null);
    try {
      setPreview(
        await previewBuy({
          contractAddress,
          sender: sender as `0x${string}`,
          marketId,
          outcome,
          paymentMon: payment,
          maximumPaymentMon: maximum,
        }),
      );
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : "Preview could not be built.");
    }
  }

  return (
    <div className="workbench">
      <section className="workbenchControls" aria-labelledby="intent-title">
        <div className="sectionLabel">Unsigned intent</div>
        <h2 id="intent-title">Describe the position, then inspect every byte.</h2>
        <label>
          Sender
          <input
            value={sender}
            onChange={(event) => setSender(event.target.value)}
            spellCheck={false}
          />
        </label>
        <label>
          Market
          <select
            value={marketId}
            onChange={(event) => setMarketId(event.target.value)}
          >
            {markets.map((market) => (
              <option key={market.marketId} value={market.marketId}>
                {market.marketId} · {market.question}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Outcome</legend>
          <div className="segmented">
            {(["YES", "NO"] as const).map((value) => (
              <button
                type="button"
                key={value}
                className={outcome === value ? "active" : ""}
                onClick={() => setOutcome(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="fieldPair">
          <label>
            Payment · MON
            <input
              inputMode="decimal"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            />
          </label>
          <label>
            Maximum · MON
            <input
              inputMode="decimal"
              value={maximum}
              onChange={(event) => setMaximum(event.target.value)}
            />
          </label>
        </div>
        <button className="primaryButton" type="button" onClick={buildPreview}>
          Build unsigned preview
        </button>
        <p className="stopNote">
          Stops before signer. No private key, signature, or broadcast path exists here.
        </p>
        {error ? <p className="errorMessage">{error}</p> : null}
      </section>

      <section className="receiptPane" aria-live="polite">
        <div className="receiptHeader">
          <div>
            <div className="sectionLabel">Action evidence</div>
            <h2>Constraint receipt</h2>
          </div>
          <StatusBadge tone="warning">MOCK</StatusBadge>
        </div>
        {preview ? (
          <>
            <div className="constraintList">
              {preview.constraints.checks.map((check) => (
                <div
                  className={`constraintRow ${
                    check.passed ? "constraintPassed" : "constraintFailed"
                  }`}
                  key={check.id}
                >
                  <span aria-hidden="true">{check.passed ? "✓" : "×"}</span>
                  <div>
                    <strong>{check.label}</strong>
                    <small>
                      Expected {check.expected} · observed {check.actual}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <details open>
              <summary>Unsigned transaction</summary>
              <pre>{stringify(preview.action.unsignedTransaction)}</pre>
            </details>
            <details>
              <summary>Mock envelope</summary>
              <pre>{stringify(preview.receipt)}</pre>
            </details>
          </>
        ) : (
          <div className="emptyReceipt">
            <span>0x</span>
            <p>Build a preview to reveal calldata, value, mock Changes, and checks.</p>
          </div>
        )}
      </section>
    </div>
  );
}
