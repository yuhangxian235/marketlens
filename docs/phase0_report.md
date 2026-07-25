# MarketLens Phase 0 report

Report date: 2026-07-25  
Scope: Phase 0 only

## Executive decision

The proposed project is feasible as a one-week portfolio MVP if scope remains fixed and Day 1 resolves the toolchain.

Approved architecture:

- minimal non-upgradeable Solidity pari-mutuel market;
- Monad Anvil fork chain 143 with a pinned upstream block number/hash for the reproducible local demo;
- Python event ledger and SQLite analytics;
- versioned SQL with independent pandas checks;
- static Evidence snapshots for Next.js;
- signer-free Action page;
- source-pinned Moss integration behind an explicit adapter seam.

Two Moss facts materially change the implementation:

1. npm `@themoss/*@0.1.0` is the old Plan API, while current `main` has the requested Capability/Receipt model and is unreleased;
2. current `main` lacks prediction-market Category/Verb/Risk vocabulary.

Therefore no Phase 0 artifact claims that Moss already runs. The honest one-week path is a pinned source workspace plus a documented minimal vocabulary patch, labeled experimental; the mock remains visibly `MOCK`.

## A. Environment check

### Workspace

- Workspace root initially contained only empty `outputs/` and `work/`;
- root is not a Git repository;
- no existing MarketLens source was found;
- Moss was cloned for research into `work/moss-upstream`;
- research clone remote: `https://github.com/nishuzumi/moss.git`;
- inspected HEAD: `d09b38cbc44ee7f5722c5d09e7224f7750187762`;
- the research clone remained clean after dependency installation, build and tests; generated dependencies/build output are ignored upstream.

### Windows tools

| Tool | Status |
| --- | --- |
| Git | `2.54.0.windows.1` |
| Node | `v24.15.0`, satisfies Moss `>=22` |
| npm | `npm.cmd 11.12.1`; bare `npm` is blocked by PowerShell script policy |
| pnpm | `11.9.0`; Moss pins `11.10.0` |
| Corepack | `0.34.6` |
| Python | bare `python` is Hermes venv `3.11.15`; `py` defaults to `3.14.5` |
| pip | bare `pip` belongs to Python 3.14; bare Python 3.11 has no pip |
| sqlite3 CLI | missing; Python SQLite works |
| uv | `0.11.19` |
| forge / cast / anvil / solc / foundryup | missing |
| Docker | missing |
| make | missing |

Python package status:

- web3.py: missing;
- pandas: missing;
- pytest: only present in the unrelated Hermes Python 3.11 environment.

Network checks to GitHub, npm and PyPI succeeded.

### WSL2 fallback

Ubuntu WSL2 is installed and running:

- Git `2.53.0`;
- Node `v22.22.3`;
- Python `3.14.4`;
- GNU Make `4.4.1`;
- Foundry/Anvil and pnpm are still missing.

WSL2 HTTPS access to the Monad Foundry installer resolved successfully (`foundry.category.xyz` → Category Labs raw installer, HTTP 200). WSL2 is the recommended Phase 1 runtime for the upstream shell-based installation. The small project can remain in the shared Windows workspace and be accessed through `/mnt/c/...`.

### Environment conclusion

Hard blocker:

- Monad Foundry/Anvil is absent, so contracts, real events and Moss fork simulation cannot run yet.

Recoverable setup:

- create a project-specific Python 3.11 environment with `uv`;
- activate Corepack pnpm `11.10.0`;
- install Monad Foundry inside WSL2;
- never mix the current bare `python` and `pip`.

## B. Moss actual-interface research

Full evidence: [moss_research.md](moss_research.md).

Verified current model:

- Protocols are decorated exported classes;
- inputs are strict Zod-backed parameter declarations;
- each Capability owns exactly one direct unsigned transaction;
- nested Capabilities own additional transactions;
- simulation pins one block and uses `debug_traceCall`;
- successful traces yield ordered Event/native-transfer Changes;
- pure Receipt parsers must cover every original Change exactly once and in order;
- any Warning halts;
- Moss never signs or sends.

MCP exposes exactly:

```text
discover → load → action → simulate
```

For programmatic constraint checks, MarketLens must use the library SDK because MCP intentionally omits structured Outcomes and raw Changes.

Release blocker:

- npm `0.1.0` tag commit: `a83434a61f81bdcc253f9b22dac53775cf6f659f`;
- current inspected main: `d09b38cbc44ee7f5722c5d09e7224f7750187762`;
- these are materially different interfaces.

Vocabulary blocker:

- no prediction-market Category;
- no `create` or `buy` Verb;
- no honest risk for admin market creation;
- every Capability requires a risk.

Local source verification at the pinned commit:

- `corepack pnpm install --frozen-lockfile`: passed with pnpm `11.10.0`;
- `pnpm build`, `pnpm typecheck` and `pnpm lint`: passed;
- `pnpm test:offline`: passed with 189 tests passed and 9 skipped.

This proves that the inspected upstream source builds and its offline suite passes on the current Windows/Node environment. It does not prove a MarketLens adapter or live Monad simulation; live/fork tests remain blocked by the missing Monad Anvil runtime.

## C. Confirmed stack

| Area | Choice | Reason |
| --- | --- | --- |
| Contract | Solidity 0.8.x + Foundry | unit/fuzz/invariant tests and compiled ABI |
| Local chain | Monad Foundry Anvil fork, chain 143 | matches Moss Runtime and trace requirements |
| RPC client | web3.py | direct log and block-envelope access |
| Analytics | Python 3.11 + pandas | deterministic transformation and independent checks |
| Database | SQLite via Python | portable local portfolio artifact |
| Exact amounts | aligned gwei INTEGER + payout wei TEXT/`uint256_sum` | avoids SQLite uint256 precision loss without rounding claims |
| Moss | pinned current-main source workspace | required Receipt model is not on npm |
| Moss encoding | viem + generated `as const` ABI | matches upstream typed Handle model |
| Web | Next.js + TypeScript | four-area portfolio UI and Node-side Moss action flow |
| Data delivery | versioned static JSON | no extra Python server or duplicate SQL layer |
| Task entrypoints | PowerShell + Make equivalents | Windows host has no native make |

## D. Directory structure

Created under this deliverable:

```text
marketlens/
├── contracts/
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
├── config/{networks,deployments}/
├── artifacts/abi/
├── scripts/
├── docs/
├── demo/
├── .env.example
├── Makefile
└── README.md
```

Each future implementation directory contains a scope README; no bulk untested code was generated.

## E. Contract design

Full specification: [contract_spec.md](contract_spec.md).

Writes:

- `createMarket(question, closesAt)`;
- `buyPosition(marketId, outcome)` payable;
- `resolveMarket(marketId, outcome)`;
- `claimReward(marketId)`.

Events:

- `MarketCreated`;
- `PositionBought`;
- `MarketResolved`;
- `RewardClaimed`.

Key decisions:

- YES/NO only;
- manual owner resolution;
- purchases close at an explicit UTC timestamp;
- `msg.value` is aligned to 1 gwei for exact contribution and pool aggregation;
- position units equal contributed native-token base units;
- remaining-pool/remaining-stake claims fully allocate rounding dust;
- zero-winner markets enter full-refund mode;
- checks-effects-interactions and reentrancy guard;
- no admin pool-withdraw function.

Transaction hash, log index, block number/hash and timestamp come from the RPC log envelope, not redundant event arguments.

## F. Data-table design

Executable, syntax-checked DDL: [`analytics/sql/schema.sql`](../analytics/sql/schema.sql). It creates 15 tables:

1. `ingest_runs`
2. `chain_blocks`
3. `raw_contract_events`
4. `indexer_checkpoints`
5. `markets`
6. `position_buys`
7. `market_resolutions`
8. `reward_claims`
9. `analysis_runs`
10. `analysis_days`
11. `wallet_daily_activity`
12. `wallet_summary`
13. `market_summary`
14. `data_quality_results`
15. `metric_evidence`

Primary event identity:

```text
chain_id + transaction_hash + log_index
```

The raw ledger also stores transaction index, block hash, raw JSON, decode status/error, decoder version and first ingest run. `ingest_runs` preserves fetched versus deduplicated counts.

## G. Metric design

Full definitions: [metric_definitions.md](metric_definitions.md).

Market activity:

- PositionBought event count;
- distinct wallets;
- total/average position;
- YES/NO amounts;
- YES-only, NO-only and both-side wallet behavior.

Cohorts:

- exactly one first-seen row per wallet;
- deterministic first-touch event order;
- cohort sum equals global distinct wallets;
- always labeled first-seen-in-sample.

Repeat:

- active days;
- markets joined;
- returned later in sample;
- one/two/3+ day shares;
- D1 only for wallets whose cohort day and next UTC day are complete.

Cross-market:

- single/multi-market;
- intersection and Jaccard;
- directional A→B based on first-event order;
- explicitly observational, not causal.

Validation:

- SQL and pandas independently read normalized event tables;
- counts and aligned-gwei totals compare exactly;
- claim payouts compare as exact decimal wei via SQL `uint256_sum(TEXT)` and independent Python `int`;
- display MON uses tolerance only after exact checks;
- any critical FAIL blocks publication.

## H. Moss Capability design

### Stable MarketLens seam

```ts
interface PredictionMarketActionAdapter {
  createMarket(input: CreateMarketInput): Promise<PreparedAction>;
  buyPosition(input: BuyPositionInput): Promise<PreparedAction>;
  claimReward(input: ClaimRewardInput): Promise<PreparedAction>;
  simulate(action: PreparedAction): Promise<MarketLensSimulationEnvelope>;
}
```

Adapters:

- `MockPredictionMarketActionAdapter`: compiled ABI and deterministic fixtures; visible `MOCK`;
- `MossPredictionMarketActionAdapter`: disabled until source pin, vocabulary, address and trace checks pass.

Common rules:

- all `uint256` values use base-10 strings/`bigint`, never JavaScript `number`;
- calldata is decoded back and compared with the validated input;
- `from`, `to`, chain, selector and `value` are checked before simulation;
- no language model produces Receipt values.

### `create_market`

Inputs:

- sender/admin;
- question;
- closes-at timestamp.

Validation:

- sender equals owner Query;
- question is 1–280 UTF-8 bytes;
- close time is after the exact pinned simulation block timestamp;
- target/address/code hash match config;
- transaction value is zero.

Evidence:

- decoded calldata;
- `MarketCreated`;
- returned market ID, question hash and close time.

### `buy_position`

Action inputs:

- sender;
- market ID;
- YES/NO;
- payment amount.

Application constraints:

- maximum payment;
- required outcome;
- minimum displayed position units.

Evidence:

- calldata and transaction value;
- sender→contract native transfer;
- `PositionBought`;
- event payment and units match the transfer;
- pool-after values.

### `claim_reward`

Inputs:

- sender;
- market ID;
- optional minimum payout application constraint.

Evidence:

- zero transaction value;
- `RewardClaimed`;
- contract→sender native transfer;
- event payout equals transfer;
- normal or refund mode.

### Application receipt

The UI object is an application envelope, not a fabricated Moss Receipt:

```text
schemaVersion
verificationMode
operation
simulationBlockNumber + blockHash + blockTimestamp
unsignedTransaction
decodedCall
marketId
marketQuestion + provenance
selectedOutcome
sender
expectedPayment
expectedPositionUnits
nativeTransfers
emittedEvents
mossReceiptOutcome
simulationSuccess
revertReason
warnings
constraintChecks
```

`marketQuestion` for a buy is indexed/query context verified by `questionHash`; it is visually separated from Change-backed Receipt facts.

Current Moss fixes a block internally but does not expose its hash/timestamp in the public simulation result. The real adapter therefore also requires a source-pinned simulator extension that returns the exact block number, hash and timestamp. A separate pre/post-simulation RPC query may not be substituted, and the adapter fails closed without this metadata.

### Real-Moss decision

Recommended one-week path:

1. pin/fork `d09b38c...`;
2. isolate a minimal vocabulary patch adding prediction-market category, create/buy verbs and an admin-action risk;
3. expose the simulator's exact pinned block number/hash/timestamp;
4. build the package inside the upstream workspace;
5. compose a custom Registry/server;
6. run on Monad Anvil fork chain 143;
7. label the result source-pinned experimental.

No semantically false mapping to `dex`, `mint` or unrelated risks is allowed.

## I. Seven-day development plan

### Day 1 — Toolchain and contract red/green

- install Monad Foundry in WSL2;
- create Python 3.11 environment and pin dependencies;
- activate pnpm 11.10;
- initialize Git;
- implement contract and Foundry unit/fuzz/invariant tests;
- generate typed ABI.

Exit: all contract tests pass; ABI hash recorded.

### Day 2 — Reproducible local chain

- start Monad Anvil fork chain 143 at mandatory `FORK_BLOCK_NUMBER`;
- verify the fork header against `FORK_BLOCK_HASH` before deployment;
- deterministic deploy;
- seed at least 3 markets and 6 wallets across several UTC days;
- resolve normal and refund-mode markets;
- claim rewards;
- record block/transaction manifests.

Exit: repeatable script produces real local logs and hashes.

### Day 3 — Event ledger

- implement RPC chunking, block enrichment and strict ABI decoding;
- create ingest/checkpoint/reorg behavior;
- populate raw and normalized tables;
- test duplicate logs and decode failures.

Exit: re-running the same range is idempotent.

### Day 4 — Analytics and evidence

- implement separate SQL files;
- implement independent pandas checks;
- build analysis-day completeness;
- export Evidence JSON;
- fail publication on critical mismatch.

Exit: mandatory checks PASS on the deterministic dataset.

### Day 5 — Moss source-pinned integration

- run pinned upstream offline suite;
- implement and test minimal vocabulary patch;
- copy Protocol template;
- implement three Capabilities and pure Receipts;
- run Change coverage failure tests and live fork simulations.

Exit: three source-pinned simulations have zero Warnings, or the UI remains explicitly MOCK and the Moss acceptance item remains failed.

### Day 6 — Frontend

- Markets, Product Analytics, Evidence and Action;
- fixed-template natural-language questions;
- structured constraint results;
- status badges for network, block range and evidence level.

Exit: no UI number exists outside generated evidence.

### Day 7 — End-to-end and portfolio polish

- fresh-machine/fresh-fork rehearsal;
- finalize README, architecture, dictionary, metrics and case study;
- fill measured resume bullets;
- record three-minute demo;
- capture known limitations.

Exit: minimum Demo criteria below pass.

## J. Current blockers and risks

| Severity | Item | Mitigation |
| --- | --- | --- |
| P0 | Monad Foundry/Anvil missing | install in WSL2 before contract work |
| P0 | npm Moss API is older than current docs | pin source commit; never mix artifacts |
| P0 | Moss vocabulary cannot express prediction market | explicit minimal fork/patch or keep real adapter disabled |
| P0 | no deployed address or code hash | deterministic local deployment manifest |
| P1 | Python executable/pip mismatch | isolated `uv` Python 3.11 environment |
| P1 | RPC trace support is endpoint-specific | official Monad Anvil fork path; fail closed |
| P1 | simulation prefunds sender | separate affordability check at signer seam |
| P1 | Receipt cannot query market question | provenance-tagged context + question-hash check |
| P1 | simulator result omits pinned block hash/time | source-pinned return-shape extension; fail closed without exact metadata |
| P1 | SQLite cannot aggregate uint256 directly | aligned gwei integers; payout wei text + tested `uint256_sum` |
| P1 | unpinned upstream fork changes the demo | mandatory fork block/hash manifest and startup verification |
| P1 | reorg and duplicate logs | block hashes, canonical flag, composite key, rebuild |
| P1 | partial UTC days bias D1 | `analysis_days` eligibility |
| P1 | no-winner result can lock funds | explicit refund mode |
| P1 | manual admin resolution | describe centralized demo trust |
| P2 | wallet counts overstate people | address-level language everywhere |
| P2 | demo fixtures are not product evidence | no product conclusion from seeded data |

## Minimum Demo acceptance criteria

Contract:

- all unit/fuzz/invariant tests pass;
- normal, refund and rounding paths conserve funds;
- events match ABI.

Data:

- real local-fork logs, not fabricated CSV;
- fetched/unique/decode counts visible;
- composite-key rerun is idempotent;
- SQL and pandas mandatory checks pass;
- every UI metric has complete Evidence metadata.

Product semantics:

- first-seen/D1/return limitations are displayed;
- wallet is never called a person or real user;
- facts, interpretations and hypotheses are separated.

Moss:

- actual source commit shown;
- exact simulation block number/hash/timestamp shown;
- exact unsigned calldata shown;
- zero-Warning fork simulation;
- ordered Changes and structured Outcome shown;
- application constraints pass or fail deterministically;
- no private key enters Moss;
- no automatic signing/broadcast.

If only the mock runs, the analytics demo may be accepted separately, but the Moss criterion is **not passed**.

## K. Phase 1 concrete files

Contracts:

- `contracts/foundry.toml`
- `contracts/src/PredictionMarket.sol`
- `contracts/script/Deploy.s.sol`
- `contracts/script/SeedDemo.s.sol`
- `contracts/test/PredictionMarket.t.sol`
- `contracts/test/PredictionMarketInvariants.t.sol`

Configuration and artifacts:

- `config/networks/local-monad-fork.json`
- `config/deployments/local-monad-fork.json`
- `artifacts/abi/PredictionMarket.ts`
- `scripts/bootstrap.ps1`
- `scripts/demo.ps1`

Analytics:

- `analytics/pyproject.toml`
- `analytics/src/marketlens/{config,rpc,indexer,decode,store,transform,validate,evidence,question_router,cli}.py`
- `analytics/sql/{normalize_events,wallet_first_seen,wallet_repeat_participation,market_activity,cross_market,data_quality}.sql`
- `analytics/sql/questions/{most_first_touch_wallets,low_repeat_participation,multi_market_wallets}.sql`
- `analytics/tests/{test_indexer,test_decode,test_metrics,test_partial_days,test_reorg}.py`

Moss/action:

- `packages/prediction-market-actions/src/{types,adapter,constraints,envelope}.ts`
- `packages/prediction-market-actions/src/adapters/{mock,moss}.ts`
- pinned Moss workspace patch under `work/` during development;
- Protocol package copied from the pinned upstream template.

Web:

- `web/src/app/{markets,product-analytics,evidence/[metricId],action}/page.tsx`
- `web/src/lib/{evidence,action-client}.ts`
- generated `web/public/data/*.json`.

## Assumptions recorded

- one non-upgradeable contract;
- owner-admin market creation/resolution;
- no fee;
- no external oracle;
- native MON only;
- 1 gwei input alignment;
- local fork is the first accepted network;
- upstream fork block number and hash are fixed and verified;
- source-pinned Moss is experimental;
- no signer integration in v1.
