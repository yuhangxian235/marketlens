# Phase 4A-R2 — Agent Batch Policy Firewall

**Verified:** 2026-07-27  
**Branch:** `phase3b/judge-ui-redesign`  
**Environment:** local Anvil, chain ID `143`

## Verified outcome

The runtime pipeline produces:

| Result | Count |
| --- | ---: |
| Proposed | 5 |
| Eligible | 2 |
| Blocked | 3 |
| Signed | 0 |
| Broadcast | 0 |

Per-proposal verdicts:

| Proposal | Moss simulation | Action policy | Batch policy | Final verdict |
| --- | --- | --- | --- | --- |
| `prop-001` | PASS | PASS | PASS | ELIGIBLE |
| `prop-002` | PASS | BLOCKED | NOT_APPLICABLE | `PAYMENT_LIMIT_EXCEEDED` |
| `prop-003` | REVERT | BLOCKED | NOT_APPLICABLE | `SIMULATION_REVERTED:NothingToClaim` |
| `prop-004` | PASS | PASS | PASS | ELIGIBLE |
| `prop-005` | PASS | PASS | BLOCKED | `BATCH_POLICY_CONFLICT` |

## Real execution chain

```text
Synthetic Agent Proposal
  → User Batch Policy
  → @themoss/core Registry
  → MarketLensPredictionMarketProtocol
  → @themoss/simulator createTraceSimulator
  → local Anvil debug_traceCall
  → Moss Receipt
  → adapter-level Capability/Receipt binding
  → action policy
  → batch policy
  → Action Receipts
  → Batch Receipt
```

`packages/batch-policy/src/engine.ts` invokes
`simulateMossProposal()` for every proposal. It does not accept a precomputed
simulation-result map and fails closed when Moss evidence is absent or invalid.

Moss core and simulator source are not modified.

## Local Anvil fixture

The Phase 4A fixture is created with:

- `anvil_setCode`
- `anvil_setStorageAt`
- `anvil_setBalance`

It does not load a private key, sign a transaction, broadcast a transaction, or
connect to Monad.

`prop-003` calls `claimReward(3)` from the wallet that holds only the losing NO
position. The local trace returns:

- error: `execution reverted`
- decoded custom error: `NothingToClaim`
- arguments: market `3` and the claimant address
- state before/after: the same block

## Receipt integrity

Policy, Action Receipt, Batch Receipt, and batch identifiers are computed at
runtime from recursively key-sorted canonical JSON using SHA-256.

`verifyBatchArtifacts()` additionally verifies the published Web artifact set:

- fixtures and published proposal/policy copies match;
- proposal, simulation, and Action Receipt IDs are one-to-one;
- every Action Receipt hash recomputes;
- the Batch Receipt hash recomputes;
- simulation evidence matches the evidence embedded in each Action Receipt;
- counts, payment totals, eligible/blocked lists, and per-market totals match;
- Moss and local trace provenance match;
- unsigned, not-broadcast, and not-deployed safety boundaries remain present;
- the manifest matches the Batch Receipt.

The current artifact set passes 99 integrity checks.

The browser independently reruns 60 Web Crypto checks before it unlocks the
five-step workflow. This browser entrypoint is built without `node:crypto`; it
uses `crypto.subtle.digest("SHA-256", ...)`. A mismatch renders a fail-closed
receipt-rejected state instead of any Proposal or Verdict screen.

## Reproduction

Install dependencies:

```powershell
pnpm install
```

Run the complete Phase 4A verification:

```powershell
pnpm verify:phase4a
```

The command runs, in order:

1. a fresh no-key local Anvil artifact generation;
2. published artifact integrity verification;
3. Batch Policy and browser tamper tests against local Anvil;
4. workspace TypeScript checks;
5. repository lint;
6. the Next.js production build.

Useful focused commands:

```powershell
pnpm --filter @marketlens/batch-policy test
pnpm --filter @marketlens/batch-policy generate
pnpm --filter @marketlens/batch-policy verify:artifacts
pnpm --filter @marketlens/web dev --port 3300
```

## Web workflow

The root route is a single five-step verification flow:

1. Proposals
2. Policy
3. Moss simulation
4. Action Receipts
5. Batch Verdict

The UI reads the runtime-generated Batch Receipt and related artifacts. It does
not expose signing, execution, submission, or broadcasting controls. A visible
`ARTIFACTS VERIFIED` seal records the browser check count; it is evidence, not
an additional workflow action.

Required boundaries remain visible:

- `SYNTHETIC AGENT PROPOSAL`
- `REAL LOCAL`
- `UNSIGNED`
- `NOT BROADCAST`
- `NOT DEPLOYED ON MONAD`

## Remaining boundaries

- Proposals are synthetic.
- Simulation is local Anvil evidence, not Monad deployment evidence.
- Published Web JSON is generated locally and then integrity-checked; the
  browser does not start Anvil itself.
- Wallet connection, private keys, signing, broadcasting, and Monad deployment
  are intentionally out of scope.
