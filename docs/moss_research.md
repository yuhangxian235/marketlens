# Moss Protocol primary-source research

Research date: 2026-07-25  
Upstream: [`nishuzumi/moss`](https://github.com/nishuzumi/moss)  
Inspected main commit: [`d09b38cbc44ee7f5722c5d09e7224f7750187762`](https://github.com/nishuzumi/moss/commit/d09b38cbc44ee7f5722c5d09e7224f7750187762), committed 2026-07-22 17:23:07 +08:00.

## 1. Identification

This is the only located project matching all terms in the request:

- Monad;
- Protocol packages and Agent-callable Capabilities;
- `discover → load → action → simulate`;
- unsigned transaction construction;
- trace simulation and structured Receipt parsing;
- `@themoss/*` packages and `packages/protocols/_template`.

The project [describes itself](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/README.md) as unaudited alpha software and says it never signs or sends transactions. It is hosted under an individual GitHub account and was not independently endorsed in the Monad official documentation located during this research. MarketLens should call it the “Moss upstream repository,” not the “official Monad SDK.”

Other same-name projects were excluded:

- [MegaETH MOSS](https://joinmoss.megaeth.com/ai-agent-guide) is a wallet execution/permission layer;
- [GhostOS MOSS](https://pypi.org/project/ghostos-moss/) is a Python model-oriented runtime;
- [OpenMOSS/MOSS](https://github.com/OpenMOSS/MOSS) is a language model;
- [RFC 1848](https://www.rfc-editor.org/rfc/rfc1848) is an email-security protocol.

## 2. Critical version split

### Published `0.1.0`

The only GitHub release is [`v0.1.0`](https://github.com/nishuzumi/moss/releases/tag/v0.1.0), tag commit [`a83434a61f81bdcc253f9b22dac53775cf6f659f`](https://github.com/nishuzumi/moss/commit/a83434a61f81bdcc253f9b22dac53775cf6f659f), released 2026-07-10.

That version uses the older architecture:

- `defineProtocolPackage`;
- `Plan`;
- `expects`;
- `planHash`;
- `@Event` observations;
- effects reconciliation.

The npm `latest` tag for `@themoss/core`, `simulator`, `system`, `erc`, `mcp-server` and `protocol-kuru` is still `0.1.0`, published on 2026-07-10. The published `@themoss/core@0.1.0` contains `Plan`/`ProtocolPackage`, not the current `CapabilityNode` and exhaustive typed Receipt model.

### Current `main`

The new framework was introduced in commit [`6b177f5`](https://github.com/nishuzumi/moss/commit/6b177f5f9c839b4a1ac7f1c7032dfe7f8a11e760) on 2026-07-16 and continued changing through the inspected commit.

The current changeset marks this as a future minor release: [capability-receipt-framework.md](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/.changeset/capability-receipt-framework.md). Current source package manifests still say `0.1.0`, so that string does not identify the npm artifact.

Consequences:

- installing npm `0.1.0` and implementing against current `main` documentation will fail;
- `@themoss/protocol-pancakeswap` referenced by current main was not published at research time;
- MarketLens needs the current Receipt model, so it must use a source-pinned workspace or wait for a new release;
- any such implementation must be labeled **source-pinned experimental**, not “npm 0.1.0 integration.”

## 3. Current package ownership

Based on the pinned [README](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/README.md):

| Package | Responsibility |
| --- | --- |
| `@themoss/core` | decorators, Registry, parameter contracts, Capability trees, Receipt validation |
| `@themoss/simulator` | `debug_traceCall`, ordered Change extraction, state chaining |
| `@themoss/erc` | address-free ERC Protocols and Receipt semantics |
| `@themoss/system` | Monad Runtime and verified system constants |
| `@themoss/protocol-*` | protocol-specific ABI, Capability, Query and Receipt semantics |
| `@themoss/mcp-server` | transport and application composition |
| `@themoss/abi-tools` | ABI fetch/render/compare build tooling |
| `packages/protocols/_template` | Protocol package template |

Root requirements are Node `>=22` and pnpm `11.10.0`: [package.json](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/package.json).

## 4. Actual current interfaces

### Protocol

Current Protocol packages export decorated classes:

```ts
@Protocol({
  name: "myprotocol",
  category: "dex",
  description: "...",
  contracts: {
    market: { abi: PredictionMarketAbi, addr: MARKET_ADDRESS },
  },
  labels: {
    Market: MARKET_ADDRESS,
  },
})
class MyProtocol {
  declare market: Handle<typeof PredictionMarketAbi>;
}
```

Sources:

- [decorators](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/decorators.ts)
- [Protocol onboarding](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/docs/protocol-onboarding.md)
- [Protocol template](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/protocols/_template/src/adapter.ts)

### Capability

Required metadata:

```ts
{
  intent: string;
  verb: Verb;
  params: ParamsSpec;
  receipt: ReceiptMethodName;
  risk: RiskLabel[];
  tags?: string[];
}
```

Each parameter is `{ type: ZodType, description: string }`. Registry constructs a strict Zod object; unknown fields fail. `load` returns JSON Schema plus field descriptions. Source: [semantics.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/semantics.ts).

Each Capability owns exactly one direct `TransactionNode`. Extra transactions belong to nested Capabilities. Core validates and depth-first flattens the Capability tree: [framework.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/framework.ts).

### Query

A Query reads state and returns JSON-safe data. It produces no transaction or Receipt.

### Receipt

Protocol authors implement:

```ts
@Receipt()
parseReceipt(changes: readonly Change[]): ReceiptResult<Outcome>
```

Current `Change` has only:

```ts
type Change =
  | { kind: "event"; address; topics; data }
  | { kind: "nativeTransfer"; from; to; value: string };
```

Receipt leaves must retain the exact original Change objects, with identical length and order. Core rejects omission, duplication, replacement or reordering. Sources:

- [types.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/types.ts)
- [framework.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/framework.ts)
- [Registry](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/registry.ts)

A Receipt parser cannot read Capability params, calldata, Runtime, Handle, Query or RPC. A reverted transaction produces no Receipt; the revert reason is in the outer simulation result.

## 5. MCP contracts

Authoritative source: [MCP tools reference](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/docs/mcp-tools.md).

### `discover`

Filters by optional closed `verb`, `category` and protocol slug. Returns capability/query coordinates.

### `load`

Accepts coordinates and returns intent, risk, tags and generated parameter schemas.

### `action`

Accepts:

```ts
{
  protocol: string;
  method: string;
  account: Address;
  params: Record<string, unknown>;
}
```

A write returns one recursive `CapabilityNode` containing immutable unsigned transaction leaves with `from`, `to`, `data` and hex `value`.

### `simulate`

Accepts the exact Capability tree returned by `action`. MCP returns a deliberately reduced Agent view:

- `ok`;
- guidance;
- optional halt reason;
- per-operation ordered Receipt texts and Warnings.

MCP omits transactions, gas, raw Changes, Receipt trees and structured Outcomes. MarketLens needs deterministic structured constraint checks, so its Action page must use the library `Registry` and `createTraceSimulator`, not only MCP prose.

The SDK `TransactionSimulation` includes:

- unsigned transaction;
- `reverted` / optional `revertReason`;
- optional Receipt and Changes;
- Warnings;
- gas estimate.

## 6. Simulation

Current simulator source: [packages/simulator/src/index.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/simulator/src/index.ts).

Flow:

1. validate and depth-first flatten the Capability tree;
2. pin one `eth_blockNumber` for the run;
3. virtually prefund the sender;
4. execute `debug_traceCall` with state overrides;
5. stop on revert;
6. extract provably ordered successful Event/native-transfer Changes;
7. run the pure Protocol Receipt parser;
8. verify exhaustive Change coverage;
9. estimate gas separately;
10. use `prestateTracer` state diffs for later transactions;
11. stop on any Warning.

Warnings:

- `REVERTED`
- `TRACE_FAILED`
- `CHANGE_ORDER_UNAVAILABLE`
- `RECEIPT_FAILED`
- `CHANGE_COVERAGE_MISMATCH`
- `STATE_CHAIN_FAILED`

RPC must support `debug_traceCall`, log/call ordering, `prestateTracer` and state overrides. Moss fails closed when evidence is unavailable: [ADR 0002](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/docs/adr/0002-simulation-via-debug-tracecall.md).

Virtual prefunding means simulation answers “what would this transaction do,” not “can this wallet afford it.” Affordability remains a signer/wallet check.

The public simulation result does not expose the internally pinned block together with its hash and timestamp. MarketLens needs that exact block reference to prove time-dependent checks such as `closesAt`. The source-pinned adapter must therefore extend the result with the pinned block number/hash/timestamp and fail closed if they are unavailable; a separate RPC read before or after simulation is not evidence of the same state.

## 7. ABI and address rules

[ADR 0007](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/docs/adr/0007-abi-origin.md) allows:

1. compiled;
2. explorer;
3. vendored.

Hand-written or hand-selected ABIs are not accepted. MarketLens owns its contract, so the ABI must be compiled from committed Solidity and generated as a complete typed TypeScript artifact.

Fixed addresses live in `@Protocol.contracts` and require provenance plus bytecode checks. The generic MCP CLI only configures `MOSS_RPC_URL`; no official arbitrary `MOSS_CONTRACT_ADDRESS` mechanism exists.

A local deployment address is temporary. It must not be presented as a publishable Moss Protocol address unless the package composition verifies its bytecode/code hash.

## 8. Local Anvil requirements

Current Runtime rejects RPC chain IDs other than Monad mainnet `143`: [runtime.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/runtime.ts).

The upstream [agent-swap fork example](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/examples/agent-swap/src/fork.ts) uses the Monad build of Foundry/Anvil to fork `https://rpc.monad.xyz`, preserving chain ID `143` and required tracing.

Therefore real local Moss acceptance needs:

- Monad-flavor Anvil;
- chain ID 143;
- a configured upstream fork block number whose header matches an expected block hash;
- trace/state-override support;
- a MarketLens deployment on that fork;
- verified deployment configuration.

Plain Anvil chain ID `31337` is not accepted.

## 9. Receipt field mapping

The requested UI object cannot all be called a Moss core Receipt.

| Requested field | Evidence source |
| --- | --- |
| `market_id` | decoded domain event |
| `market_question` | Query/indexed context verified with event `questionHash`; not a buy Receipt fact |
| `selected_outcome` | `PositionBought` event |
| `sender` | event plus native-transfer cross-check |
| `expected_payment` | transaction value/native transfer plus event amount |
| `expected_position_units` | explicit event field |
| `expected_balance_changes` | native transfers and domain events only; not arbitrary storage diffs |
| `emitted_events` | SDK raw Changes |
| `simulation_success` | derived from no halt/no Warnings |
| `revert_reason` | outer simulation; a revert has no Receipt |
| `warnings` | outer simulation |

Simulation has no mined transaction hash, block number or log index. MarketLens must never fabricate them.

Recommended application envelope:

```ts
type MarketLensSimulationEnvelope = {
  verificationMode: "mock" | "moss-source-pinned";
  operation: "create_market" | "buy_position" | "claim_reward";
  capability: unknown;
  mossReceipt?: unknown;
  outcome?: unknown;
  changes?: unknown[];
  simulationSuccess: boolean;
  revertReason?: string;
  warnings: unknown[];
  marketContext?: {
    question: string;
    questionHash: string;
    source: "indexed-chain-state";
  };
};
```

UI must visually separate Change-backed evidence from contextual data.

## 10. Prediction-market vocabulary blocker

Current closed types in [types.ts](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/core/src/types.ts):

- Category: `dex`, `lending`, `staking`, `rewards`, `token`, `nft`;
- Verb: no `create` or `buy`;
- RiskLabel: only `fundOut`, `approval`, `priceImpact`;
- every Capability must declare a non-empty risk list.

Impact:

| Capability | Blocker |
| --- | --- |
| `create_market` | no prediction-market category, create verb or honest risk label |
| `buy_position` | `fundOut` fits, but no buy verb |
| `claim_reward` | claim verb exists, but no honest required risk label |
| whole Protocol | no prediction-market category |

Free-form tags cannot replace category/verb. Mapping these to `dex`, `mint` or unrelated risk labels would undermine intent alignment.

True integration therefore requires either:

- an upstream vocabulary change; or
- an explicitly documented source-pinned fork.

## 11. Required package tests

Based on [Protocol onboarding](https://github.com/nishuzumi/moss/blob/d09b38cbc44ee7f5722c5d09e7224f7750187762/docs/protocol-onboarding.md) and [template tests](https://github.com/nishuzumi/moss/tree/d09b38cbc44ee7f5722c5d09e7224f7750187762/packages/protocols/_template/test):

- compile-time valid and `@ts-expect-error` fixtures;
- Registry metadata validation;
- exactly one direct transaction per Capability;
- exact calldata/to/from/value tests;
- original Change identity and exhaustive ordered coverage;
- missing/duplicate/replaced/reordered Change failures;
- unexpected event and revert failures;
- fixed-address bytecode checks;
- Monad live/fork happy path with zero Warnings.

Command order:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test:offline
```

Build must precede typecheck because workspace packages resolve generated declarations.

Local verification on 2026-07-25 used the pinned commit and Corepack-provided pnpm `11.10.0`:

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | passed |
| `pnpm build` | passed |
| `pnpm typecheck` | passed |
| `pnpm lint` | passed across 127 files |
| `pnpm test:offline` | 189 passed, 9 skipped |

The clone remained Git-clean after these commands. This validates the upstream source and offline suite only. It does not validate a MarketLens Protocol package, a Monad RPC connection or a live/fork simulation; those require the missing Monad Foundry/Anvil runtime and an implemented adapter.

## 12. Phase 0 decision

Create a stable MarketLens seam now:

```ts
interface PredictionMarketActionAdapter {
  createMarket(input: CreateMarketInput): Promise<PreparedAction>;
  buyPosition(input: BuyPositionInput): Promise<PreparedAction>;
  claimReward(input: ClaimRewardInput): Promise<PreparedAction>;
  simulate(action: PreparedAction): Promise<MarketLensSimulationEnvelope>;
}
```

Adapters:

- `MockPredictionMarketActionAdapter`
  - uses the compiled real ABI;
  - returns `verificationMode: "mock"`;
  - never claims Moss or chain execution.
- `MossPredictionMarketActionAdapter`
  - remains disabled until the source pin, vocabulary decision, Monad Anvil traces, address provenance and upstream tests pass.

If the one-week demo must include real Moss:

1. fork/pin the inspected commit;
2. add the Protocol inside its workspace;
3. make and document the minimal closed-vocabulary change;
4. compose a custom MCP/library runtime;
5. run against Monad Anvil fork chain 143;
6. label it **source-pinned experimental**, not npm `0.1.0`.
