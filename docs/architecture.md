# Architecture

## 1. Scope and assumptions

This design is limited to the one-week MVP:

- one binary YES/NO pari-mutuel contract;
- one Monad-compatible network profile at a time;
- event-derived analytics, no fabricated CSV;
- three Moss write Capabilities;
- no automatic oracle, CLOB, AMM, secondary sale, leverage, PnL, or automatic signing.

Conservative assumptions:

- local end-to-end runs on the **Monad build of Anvil**, forking a configured Monad mainnet block and reporting chain ID `143`;
- the upstream fork block number and expected hash are pinned and verified before deployment;
- all timestamps are normalized to UTC;
- wallet addresses are stored lowercase and described only as wallets/addresses;
- contract deployment address and ABI are generated artifacts, never hard-coded from memory;
- analysis results are invalid until data-quality checks pass.

## 2. Runtime flows

### Analytics flow

```text
RPC eth_getLogs
  → RawLogEnvelope
  → strict ABI decoder
  → raw_contract_events (idempotent composite key)
  → normalized event tables
  → versioned SQL transformations
  → SQLite summaries
  ↘ pandas Decimal validation
  → evidence catalog + frontend JSON
```

### Action flow

```text
User constraints
  → PredictionMarketActionAdapter interface
  → Moss Protocol action
  → immutable unsigned Capability tree
  → Moss trace simulator
  → ordered Event/native-transfer Changes
  → pure Protocol Receipt parser
  → application ActionReceipt envelope
  → deterministic constraint checker
  → UI display
  → STOP before signer
```

Moss never receives a private key and never broadcasts a transaction.

## 3. Deep modules and seams

The architecture uses a small number of deep modules. Each module exposes one narrow interface; callers and tests use the same seam.

### `PredictionMarket` contract module

Interface:

- `createMarket`
- `buyPosition`
- `resolveMarket`
- `claimReward`
- public read methods generated from state

Implementation hidden behind the interface:

- lifecycle checks;
- pool accounting;
- proportional payout and rounding-dust handling;
- claim replay prevention;
- event evidence;
- reentrancy protection.

### `EventIndexer` module

Proposed interface:

```python
sync(contract, from_block, to_block) -> SyncReport
```

Implementation hides:

- RPC chunking and retry;
- block/header lookup;
- reorg metadata;
- strict ABI decoding;
- checkpoint update;
- composite-key upsert.

Adapters:

- `Web3RpcAdapter`;
- deterministic in-memory fake for tests.

### `AnalyticsPipeline` module

Proposed interface:

```python
run(analysis_window) -> AnalysisRun
```

Implementation hides:

- normalized table rebuild;
- versioned SQL execution;
- exact payout-wei reconciliation with Python `int` and a tested SQLite `uint256_sum(TEXT)` aggregate;
- exact bounded-gwei aggregation for aligned contributions and pools;
- evidence export;
- SQL/pandas reconciliation;
- fail-closed publishing.

### `EvidenceCatalog` module

Proposed interface:

```python
get(metric_id, analysis_run_id) -> MetricEvidence
```

The frontend never invents metric definitions. It receives the definition, numerator, denominator, SQL file, time/block range, sample size, transaction hashes and limitations from this module.

### `PredictionMarketActionAdapter` seam

Proposed application interface:

```ts
interface PredictionMarketActionAdapter {
  createMarket(input: CreateMarketInput): Promise<UnsignedAction>;
  buyPosition(input: BuyPositionInput): Promise<UnsignedAction>;
  claimReward(input: ClaimRewardInput): Promise<UnsignedAction>;
  simulate(action: UnsignedAction): Promise<ActionReceipt>;
}
```

Adapters:

- `MossPredictionMarketAdapter`: uses the real pinned Moss source;
- `MockPredictionMarketAdapter`: deterministic test double only.

Two adapters make this a real seam. The mock is never presented as a successful Moss integration.

### `ConstraintChecker` module

Pure interface:

```ts
check(intent: UserConstraints, receipt: ActionReceipt): ConstraintResult
```

It verifies values, not prose:

- sender equality;
- selected outcome equality;
- payment `<= maxPaymentWei`;
- position units `>= minPositionUnits`;
- `simulationSuccess === true`;
- zero warnings;
- event/native-transfer evidence agrees.

### `QuestionRouter` module

The natural-language MVP is a closed router, not arbitrary text-to-SQL:

```text
question
  → one of 3 intent IDs
  → pre-registered read-only SQL file
  → bound parameters
  → row limit + SQLite progress-handler timeout
  → structured answer + Evidence IDs
```

Supported intents:

1. market with the most first-touch wallets;
2. market with relatively low repeat participation;
3. number/share of wallets joining multiple markets.

Unknown questions return the supported list. The model never authors or directly executes SQL.

## 4. Storage ownership

- `raw_contract_events` is the immutable canonical event envelope, except an RPC reorg may set `removed=1`;
- normalized event tables own typed event arguments;
- summary tables are disposable materializations tied to `analysis_run_id`;
- SQL files own metric logic;
- pandas owns independent cross-check logic, not the primary metric;
- frontend JSON is disposable output and cannot become a data source.

## 5. Time and block windows

Every analysis run stores:

- inclusive `from_block` and `to_block`;
- UTC `window_start_ts` and `window_end_ts`;
- whether the first/last UTC day is partial;
- pipeline version;
- source event count.

SQL filters event timestamps with a half-open interval:

```sql
block_timestamp >= :window_start_ts
AND block_timestamp < :window_end_ts
```

Date-level grouping uses `DATE(block_timestamp)`. D1 includes a wallet only when both its first-seen UTC date and the following UTC date are completely observed.

## 6. Local and public network profiles

### `local-monad-fork`

- Monad-specific Anvil forks `https://rpc.monad.xyz`;
- RPC reports chain ID `143`;
- `FORK_BLOCK_NUMBER` is mandatory and its header must match `FORK_BLOCK_HASH`;
- fixed public Anvil development keys may be used outside Moss;
- contract deployment and sample activity are local only;
- Moss builds and simulates but does not sign/send;
- a separate demo driver may submit pre-reviewed transactions to the disposable fork.

The pinned Moss simulator internally fixes a block number, but its current public result does not expose that block's hash or timestamp. The source-pinned integration therefore requires a small fail-closed simulator extension that returns the exact pinned block number, hash and timestamp in the application envelope. Time constraints such as `closesAt` compare against that timestamp; a separate RPC read before or after simulation is not accepted as proof of the same state.

### `monad-mainnet`

- requires a real deployment, verified address provenance and funding;
- not needed for the first local portfolio demo;
- no mainnet claim is permitted until transaction hashes and explorer links exist.

## 7. Frontend data strategy

For the one-week MVP, Python writes versioned JSON under `web/public/data/` after validation. Next.js renders:

- Markets;
- Product Analytics;
- Evidence;
- Action.

This avoids adding a second SQL implementation through a Node SQLite driver. The Action route remains TypeScript because Moss is TypeScript.

## 8. Directory structure

```text
marketlens/
├── contracts/
│   ├── src/
│   ├── script/
│   └── test/
├── analytics/
│   ├── src/
│   ├── sql/
│   ├── data/
│   ├── reports/
│   └── tests/
├── web/
├── packages/
│   ├── prediction-market-actions/
│   └── moss-prediction-market/
├── config/
│   ├── networks/
│   └── deployments/
├── artifacts/abi/
├── scripts/
├── docs/
├── demo/
├── .env.example
├── Makefile
└── README.md
```

## 9. Key decisions

1. **Events are the analytics source of truth.** Contract views may support UX, but metrics derive from indexed logs.
2. **RPC metadata enriches logs.** Transaction hash, log index, block number and block timestamp are not redundantly emitted as Solidity arguments.
3. **Exact amounts remain decimal strings.** SQLite `REAL` values are display/aggregate helpers and are checked against Python `Decimal`.
4. **First-touch is deterministic.** If a wallet buys in multiple markets on its first date, its first-touch market is the earliest `(block_number, transaction_index, log_index)` event.
5. **Moss source is pinned.** Current `main` and published `0.1.0` have materially different models.
6. **Moss Receipt and application receipt are distinct.** The Protocol Receipt contains only Change-backed facts; the application envelope can add provenance-tagged query context and constraint results.
7. **Publishing fails closed.** A failed data-quality or Moss Warning state prevents evidence artifacts from being marked valid.

## 10. Reproducibility manifest

Every demo report must record:

- MarketLens git commit;
- Moss git commit;
- contract bytecode hash and ABI hash;
- chain ID, RPC label and contract address;
- from/to blocks and block hashes;
- Python, Node, pnpm, Foundry versions;
- SQL file hashes;
- analysis run ID;
- generated artifact hashes.
