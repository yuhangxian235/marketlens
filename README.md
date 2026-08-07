# MarketLens

**Safe transactions can still form an unsafe plan.**

MarketLens is a batch-level policy firewall for autonomous Agent operations.

Individual actions may simulate successfully and pass action-level rules while the complete Agent plan still contradicts itself or exceeds aggregate user constraints.

---

## Problem

AI Agents increasingly plan multiple onchain actions at once. A transaction simulator can verify each action individually — it cannot determine whether the complete plan contradicts itself or exceeds the user's aggregate budget.

## What MarketLens does differently

MarketLens adds a **batch-level policy firewall** that examines the Agent's entire proposed operation batch before signing. It catches cross-action contradictions and cumulative risks that single-transaction simulation silently misses.

```
Agent Proposals
      ↓
Moss / Simulation Evidence
      ↓
Action-Level Checks
      ↓
MarketLens Batch Policy
      ↓
ALLOW / BLOCK
      ↓
Verified Receipt
      ↓
Monad Testnet Attestation
```

**Moss tells MarketLens what each proposed action would do; MarketLens decides whether the Agent's complete plan should be allowed.**

## 30-second judge path

```bash
pnpm install --frozen-lockfile
pnpm --filter @marketlens/web dev --port 3300
```

Open <http://localhost:3300>. The `predev` script builds all workspace dependencies before starting Next.js.

---

## Two batch-only risks

### 1. Contradictory Intent

Two individually valid actions take opposite positions on the same market. Both pass simulation. Both pass per-action rules. The firewall detects the contradiction and blocks one.

- **Before**: 1 eligible / 1 blocked — `BATCH_POLICY_CONFLICT`
- **Resolved**: 2 eligible / 0 blocked

### 2. Hidden Cumulative Spend

Each action stays under the per-action payment limit. Together they exceed the user's total batch budget. Single-simulation approves both. The firewall catches the cumulative total.

- **Before**: blocked — `BATCH_TOTAL_PAYMENT_EXCEEDED`
- **Resolved**: 2 eligible / 0 blocked

---

## Monad Testnet Proof

Monad is the public verification anchor — not the execution venue for prediction-market actions. After MarketLens evaluates a batch, only verified receipt hashes are published:

```
Verified Batch Receipt
        ↓
Canonical Hashes
        ↓
BatchReceiptRegistry (0x85AD…4203)
        ↓
Monad Testnet
        ↓
Public Explorer Proof
```

| Field | Value |
|-------|-------|
| Chain | Monad Testnet (10143) |
| Registry | [0x85AD7b41DC64d8E191A9Dc56B398068341c54203](https://testnet.monadexplorer.com/address/0x85AD7b41DC64d8E191A9Dc56B398068341c54203) |
| Deployment TX | [0x9649d1…7730](https://testnet.monadexplorer.com/tx/0x9649d1644046fe74032198ff5197f595f9250c2fb8c856bb2cda65ada3827730) |
| Attestation TX | [0x6ab6de…fe52](https://testnet.monadexplorer.com/tx/0x6ab6de991889f88fe5906fc0e679ca53eeb55e0369a34772c519a62ff477fe52) |

> Zero user Agent actions are signed or broadcast. A project-controlled Monad Testnet transaction records only verified receipt hashes.

---

## Policy presets

| Policy | Eligible | Blocked | Main behavior |
|--------|----------|---------|---------------|
| Strict | 1 | 4 | Low action (0.10 MON) and batch (0.25 MON) limits; conflicts blocked |
| Default | 2 | 3 | Moderate limits (0.50 MON); conflicts blocked |
| Permissive | 4 | 1 | High limits (10.00 MON); opposing positions allowed |

Default policy fixture: 5 proposed, 2 eligible, 3 blocked, 0 signed, 0 broadcast.

---

## Live Local Lab

The default **Verified Demo** uses pre-generated Moss evidence artifacts. The **Live Local Lab** calls a local Anvil fixture for fresh evidence on exactly two proposals — demonstrating Contradictory Intent and Hidden Cumulative Spend.

- **Run**: `pnpm demo:live` (starts Anvil, seeds contract, starts Next.js)
- **Mode switch**: Click "Live Local Lab →" in the masthead
- **API**: `POST /api/verify-live-batch` — 2 proposals only (422 otherwise), validates inputs, runs `debug_traceCall`, returns Batch Receipt
- **Safety**: Local Anvil only. No wallet, no signing, no broadcast.

Both modes are **UNSIGNED**, **NOT BROADCAST**, and **ATTESTED ON MONAD TESTNET**.

---

## Architecture

The batch-policy engine is protocol-agnostic. The reference implementation targets prediction markets.

| Capability | Status | Boundary |
|------------|--------|----------|
| Solidity prediction market | REAL LOCAL | Foundry contract and tests |
| Moss protocol adapter | REAL LOCAL | Source-pinned `@themoss/core` |
| Moss Evidence Verification | REAL LOCAL | Unsigned local Anvil `debug_traceCall` |
| Batch policy firewall | REAL LOCAL | Action and batch policy verdicts |
| Web workflow | REAL UI | Pre-generated Moss simulation artifacts |
| Wallet signing | NOT IMPLEMENTED | No signer path |
| Broadcasting | NOT IMPLEMENTED | No send path |
| Monad attestation | **DEPLOYED** | [Registry](https://testnet.monadexplorer.com/address/0x85AD7b41DC64d8E191A9Dc56B398068341c54203) |

---

## Verified in this submission

| Check | Result |
|-------|--------|
| Web tests | 35 passed, 0 failed |
| Foundry tests | 53 passed, 0 failed |
| Batch-policy tests | 10 passed, 0 failed, 12 skipped (requires Anvil) |
| Typecheck | 0 errors |
| Lint | 0 errors, 0 warnings |
| CI | success |

---

## Run locally

```powershell
# Requirements: Node >= 22, pnpm 11.10.0
pnpm install --frozen-lockfile
pnpm --filter @marketlens/web dev --port 3300
```

Contracts use Foundry (`forge test`). Analytics uses Python 3.11 and `uv`.

```powershell
# Full verification
pnpm verify:phase4a:full
```

---

## Repository layout

```text
marketlens/
├── contracts/                         # Solidity + Foundry tests
├── analytics/                         # RPC indexer, SQLite, SQL/pandas
├── external/moss/                     # Vendored @themoss/core + @themoss/simulator
├── packages/
│   ├── prediction-market-actions/     # Action calldata + application seam
│   ├── moss-prediction-market/        # Moss protocol adapter
│   ├── batch-policy/                  # Action/batch policy firewall
│   ├── agent-planner/                 # Deterministic Agent proposal generator
│   └── polymarket-shadow/             # Shadow-market research
├── web/                               # Next.js firewall UI
├── config/                            # Network + deployment manifests
├── artifacts/                         # ABI, reproduction, visual evidence
├── scripts/                           # Local bootstrap/reproduction
└── docs/                              # Architecture, audits, phase reports
```

---

## Moss dependency

MarketLens vendors `@themoss/core` and `@themoss/simulator` from the Moss upstream repository.

- **Upstream**: <https://github.com/nishuzumi/moss>
- **Pinned commit**: `d09b38cbc44ee7f5722c5d09e7224f7750187762`
- **License**: MIT
- **Vendored under**: `external/moss/` (no modifications)

---

## Safety boundaries

- `SYNTHETIC AGENT PROPOSAL`
- `REAL LOCAL`
- `UNSIGNED`
- `NOT BROADCAST`
- `ATTESTED ON MONAD TESTNET`

No UI control or backend path signs, submits, executes, or broadcasts Agent proposals.

---

## Fixture security

Legacy reproduction scripts use well-known Anvil development keys for ephemeral local fixtures. The Live Lab fixture (`scripts/fixture.sh`) uses state-injection RPC methods — no raw private keys, no `cast send`, no `eth_sendTransaction`. The Live verification API performs `debug_traceCall` only.
