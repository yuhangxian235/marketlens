# MarketLens — Submission Copy

## One-line description

MarketLens is a pre-sign policy firewall for AI-agent-prepared prediction-market actions, using deterministic Moss evidence verification and a three-tier batch policy engine.

## Short description (~100 words)

MarketLens inserts a user-controlled policy firewall between AI Agent proposals and wallet signing. Five synthetic Agent proposals arrive. The user sets payment limits, evidence requirements, and conflict rules via three presets (Strict/Default/Permissive). Every proposal carries pre-generated Moss evidence — real local Anvil `debug_traceCall`, not a frontend mock. The batch engine evaluates all five together, detecting conflicts invisible to single-action simulation. Under Default policy: 2 eligible, 3 blocked, 0 signed, 0 broadcast. The browser re-verifies 60 Web Crypto integrity checks before showing any result.

## Full description

### Problem

AI Agents can prepare prediction-market transactions faster than users can manually inspect them. A transaction that appears safe in isolation may become unsafe inside a batch: payment limits get exceeded, real onchain execution reverts, or opposing positions on the same market create conflicts. Single-action simulators cannot catch these cross-action problems.

### Solution

MarketLens adds a deterministic batch policy firewall before wallet signing. A policy-blind Agent planner generates five unsigned proposals. The user defines a policy — payment limits, allowed capabilities, required evidence, conflict rules. Every proposal is paired with pre-generated Moss + Anvil execution evidence. The batch engine evaluates the full set, assigns structured reason codes (`PAYMENT_LIMIT_EXCEEDED`, `SIMULATION_REVERTED`, `BATCH_POLICY_CONFLICT`), and produces a canonical Batch Receipt with an unsigned allowlist.

### How it works

```
Synthetic Agent Batch → User Policy → Moss Evidence Verification → Structured Receipts → Batch Verdict → Unsigned Allowlist
```

The browser consumes pre-generated local Moss simulation artifacts and re-verifies 60 Web Crypto integrity conditions before unlocking the workflow. It does not trigger a new live Anvil simulation on demand.

### Technical implementation

| Layer | Technology | Status |
| --- | --- | --- |
| Prediction market | Solidity 0.8.26 + Foundry | REAL LOCAL — 44 tests passed |
| Agent planner | TypeScript, deterministic snapshot | SYNTHETIC — 5 proposals from local fixture |
| Moss adapter | `@marketlens/moss-prediction-market` | REAL LOCAL — source-pinned Protocol |
| Moss simulator | `@themoss/simulator` (vendored) | REAL LOCAL — Anvil debug_traceCall |
| Batch policy engine | TypeScript, canonical SHA-256 hashing | REAL LOCAL — 10 unit tests passed, 12 integration skipped |
| API route | `POST /api/evaluate-batch` | REAL — Next.js dynamic route |
| Web UI | Next.js 16, React 19, dark theme | REAL — 10 routes (9 static + 1 dynamic API) |
| Browser integrity | Web Crypto SHA-256 | REAL — 60 checks before workflow unlock |

### What is real

- Solidity contract and 44 Foundry tests
- Moss Protocol adapter (source-pinned, unmodified upstream)
- Local Anvil `debug_traceCall` simulation on chain 143
- Batch policy engine with deterministic verdicts
- Canonical receipt hashing (recursive key-sorted SHA-256)
- Browser Web Crypto integrity re-verification
- Next.js UI with three-tier policy presets

### What is mocked or pre-generated

- Agent proposals: deterministic planner from synthetic market snapshot
- Moss simulation outputs: pre-generated during artifact build, verified at release time
- Batch receipts: dynamically evaluated for the selected policy from verified proposals and pre-generated Moss evidence; the published Default receipt remains part of the source-artifact integrity set

The browser does not trigger new live Anvil simulation. It re-verifies published canonical artifacts.

**Screenshot provenance:** Demo screenshots in `docs/assets/demo/` are previously generated real demo artifacts from the same `e5f769a` code baseline; they were not re-captured during this documentation sprint.

### Policy presets

| Policy | Eligible | Blocked | Key behavior |
| --- | --- | --- | --- |
| Strict | 1 | 4 | 0.10 MON/action, 0.25 MON total, conflicts blocked |
| Default | 2 | 3 | 0.50 MON/action, 0.50 MON total, conflicts blocked |
| Permissive | 4 | 1 | 10.00 MON/action, 10.00 MON total, opposing positions allowed |

### Safety boundaries

- `SYNTHETIC AGENT PROPOSAL` — all proposals are deterministic, not live AI
- `REAL LOCAL` — simulation is real local Anvil, not Monad deployment
- `UNSIGNED` — no wallet, no private key, no signature path
- `NOT BROADCAST` — no transaction send path exists
- `NOT DEPLOYED ON MONAD` — local evidence only, chain 143

### How to run

```bash
pnpm install --frozen-lockfile
pnpm --filter @marketlens/web dev --port 3300
```

Open <http://localhost:3300>. Toggle between Strict/Default/Permissive presets. Inspect Action Receipts and the Batch Verdict.

### Future work

- Fresh browser-triggered local simulation (currently pre-generated artifacts)
- Wallet integration behind explicit user approval
- Live market adapters (Polymarket shadow research prototype exists in `packages/polymarket-shadow/`)
- Policy templates and team workflows
- Audit workflows with multi-party review
