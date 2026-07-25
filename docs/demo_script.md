# Three-minute demo script

## Status

Verified Phase 1 local-fork script. The data path is real; the Action path is a deterministic
mock and must not be presented as a live Moss simulation.

### 0:00–0:25 — Positioning

“MarketLens is an evidence-backed prediction-market product analyst for Monad. It converts contract events into wallet-level product analytics, then uses Moss to construct and simulate unsigned actions. It is not an auto-betting bot.”

Show:

- network, chain ID, contract address;
- indexed block/time range;
- latest data-quality status.

### 0:25–0:55 — Markets

Open Markets:

- trade count, unique wallets and amount;
- YES/NO amount;
- YES-only, NO-only and both-side wallets.

Say:

“Trade count here means `PositionBought` events. Wallet means address-level participant. Every number comes from the displayed contract and block range.”

### 0:55–1:35 — Product analytics

Open Product Analytics:

- first-seen-in-sample cohort;
- active-days distribution;
- D1 eligible and returned;
- single versus multi-market wallets;
- one A→B continuation example.

Say:

“First-seen is only first observed in this sample. D1 excludes partial days and requires the next full UTC date. This is sample repeat participation, not platform retention.”

### 1:35–1:55 — Evidence

Click one metric:

- definition;
- numerator and denominator;
- SQL;
- block/time range;
- SQL/pandas values;
- sample hashes;
- limitations.

Say:

“The analysis is publishable only when all critical checks pass.”

### 1:55–2:45 — Action

Select a market and enter:

- outcome YES;
- payment 1 MON;
- maximum payment 1.5 MON.

Show:

- exact unsigned calldata and value;
- deterministic mock Changes;
- mock Receipt envelope;
- constraint checks.

Say:

“The application built exact unsigned calldata and compared deterministic structured values
with the request. The `MOCK_ONLY` warning fails one check on purpose. The source-pinned Moss
package passes offline build and tests, but live simulation stays disabled until its metadata
and zero-Warning requirements can be proved.”

### 2:45–3:00 — Safety and takeaway

Say:

“This demo stops before signing. Moss never holds a private key and does not broadcast. MarketLens demonstrates Solidity event design, idempotent indexing, SQL and pandas validation, product analytics, and evidence-backed Agent actions in one reproducible flow.”

## Presenter preflight

- local Monad fork uses the configured upstream block number and verified header hash;
- deployment address matches config and bytecode;
- sample transaction hashes exist;
- index range is pinned;
- all data checks PASS;
- Action panel says `MOCK` and its warning check fails visibly;
- UI clearly says local fork and unsigned;
- no production key is present.
