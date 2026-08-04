# MarketLens

MarketLens is a local prediction-market evidence pipeline and pre-sign Agent
policy firewall. It combines a Solidity market, RPC event indexing,
SQLite/SQL/pandas analytics, a source-pinned Moss protocol adapter, real local
`debug_traceCall` simulation, deterministic policy evaluation, and a Next.js
evidence UI.

The repository does **not** claim a Monad deployment. It does not connect a
wallet, load private keys, sign transactions, or broadcast Agent actions.

## Current status

| Capability | Status | Boundary |
| --- | --- | --- |
| Solidity prediction market | **REAL LOCAL** | Foundry contract and tests |
| Event indexing and analytics | **PARTIALLY VERIFIED** | Local pipeline implemented; current submission tests not revalidated |
| Moss protocol adapter | **REAL LOCAL** | Source-pinned `@themoss/core` integration |
| Moss simulation | **REAL LOCAL** | Unsigned local Anvil `debug_traceCall` |
| Batch policy firewall | **REAL LOCAL** | Action and batch policy verdicts |
| Web workflow | **REAL UI** | Consumes pre-generated local simulation artifacts |
| Wallet signing | **NOT IMPLEMENTED** | No signer or private-key path |
| Broadcasting | **NOT IMPLEMENTED** | No send path |
| Monad deployment | **NOT DEPLOYED** | Local evidence only |

## Verified in the current submission build

- Foundry: 44 passed, 0 failed
- Batch-policy Vitest: 10 passed, 0 failed
- Live-Anvil integration tests: 12 skipped in the offline run
- Next.js build: 8 routes built successfully
- Analytics dependencies: repaired
- Analytics pytest: not independently revalidated in this submission build

## Agent Batch Policy Firewall

The root Web route presents one five-step flow:

```text
5 Agent Proposals
  → User Policy
  → Moss Simulation
  → Action Receipts
  → Batch Verdict
```

The verified fixture produces:

- 5 proposed
- 2 eligible
- 3 blocked
- 0 signed
- 0 broadcast

The local Moss/Anvil simulation implementation is real. The current browser
demo consumes pre-generated local simulation outputs rather than triggering a
new Anvil simulation on demand.

See [Phase 4A-R2 audit](docs/phase4a-batch-implementation-audit.md) for the
execution chain, evidence, hashes, reproduction commands, and safety boundaries.

## Repository layout

```text
marketlens/
├── contracts/                         # Solidity contract and Foundry tests
├── analytics/                         # RPC indexer, SQLite, SQL/pandas analytics
├── packages/
│   ├── prediction-market-actions/     # Action calldata and application seam
│   ├── moss-prediction-market/        # Source-pinned Moss protocol adapter
│   ├── batch-policy/                  # Phase 4A action/batch policy firewall
│   └── polymarket-shadow/             # Shadow-market research implementation
├── web/                               # Next.js evidence and firewall UI
├── config/                            # Network and deployment manifests
├── artifacts/                         # ABI, reproduction, and visual evidence
├── scripts/                           # Local bootstrap/reproduction entrypoints
└── docs/                              # Architecture, audits, and phase reports
```

## Install

```powershell
pnpm install
```

Analytics uses Python 3.11 and `uv`; contracts use Foundry in WSL.

## Verify Phase 4A

```powershell
pnpm verify:phase4a
```

This regenerates Batch artifacts from a no-key local Anvil fixture, verifies 99
release-time and 60 browser-time integrity conditions, runs Batch Policy and
tamper tests, typechecks and lints the workspace, and builds the Next.js
application.

Focused commands:

```powershell
pnpm --filter @marketlens/batch-policy test
pnpm --filter @marketlens/batch-policy generate
pnpm --filter @marketlens/batch-policy verify:artifacts
pnpm --filter @marketlens/web dev --port 3300
```

## Full local verification

```powershell
pnpm verify:phase4a:full
```

The full command installs the locked JavaScript dependencies, runs the focused
Phase 4A verification plus Analytics, Action, Moss core/simulator/protocol,
shadow-market, Foundry unit/fuzz/invariant, format, secret, and Git whitespace
checks. Its protocol fixture starts a no-key local Anvil on port `8546` and
always stops it, including after a failed check.

## Safety boundaries

- `SYNTHETIC AGENT PROPOSAL`
- `REAL LOCAL`
- `UNSIGNED`
- `NOT BROADCAST`
- `NOT DEPLOYED ON MONAD`

No UI control or backend path signs, submits, executes, or broadcasts the Agent
proposals.
