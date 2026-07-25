# Phase 1 report

Date: 2026-07-25  
Status: complete, with live Moss simulation intentionally disabled

> Historical implementation report. The truthfulness and reproducibility findings in
> [Phase 1.5 Local MVP Baseline Audit](local_mvp_baseline_audit.md) supersede broad
> completion claims here. In particular, the current JSON is a static demo snapshot and
> a clean regeneration is blocked without Monad RPC access and a first Git commit.

## Outcome

Phase 1 turns the Phase 0 design into a reproducible local-fork product slice:

```text
Monad pinned fork → Solidity events → idempotent SQLite ledger
→ versioned SQL + pandas checks → evidence JSON → Next.js UI

Intent → deterministic unsigned transaction → mock Receipt
→ typed constraint checks → stop before signer
```

The demo pins Monad chain ID `143`, upstream block `90057009`, and block hash
`0xf05d45f8e5bf9d4b68016423d9631b341160bc06b92e6e62ac7402f99be77fe7`.
The generated analysis covers blocks `90057010–90057042`.

## Acceptance evidence

| Area | Result |
| --- | --- |
| Contract | Binary pari-mutuel market, manual resolution, proportional payout, zero-winner refund, CEI/reentrancy guard |
| Contract tests | Unit, fuzz and stateful invariant suite passes |
| Fixture | 3 markets, 6 development wallets, 12 buys, 3 resolutions, 8 claims |
| Index | 26 fetched logs, 26 unique logs, 0 decode errors |
| Data quality | 6/6 critical SQL ↔ pandas/Python checks PASS |
| Product metrics | 6 wallets; 5 multi-market; 5 returned later; D1 4/6 |
| Evidence | Definitions, numerator/denominator, SQL file, run bounds, limitations and sample transaction hashes |
| Action | Exact unsigned calldata/value plus 8 constraint checks; `MOCK_ONLY` is intentionally not a pass |
| Moss | Pinned source patch and Protocol package build/typecheck/tests pass in upstream workspace |
| Web | Markets, Product analytics, Evidence and Action routes build and render responsively |

## Moss decision

The UI remains `ACTION MOCK`. The live adapter throws instead of falling back because the
current simulator response does not expose enough pinned-block metadata to prove the temporal
constraint, and no zero-Warning live trace has been established. No signer or broadcast code
exists in the application.

## Reproduce

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1 -SkipMoss
powershell -ExecutionPolicy Bypass -File scripts/demo.ps1
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

Contract tests run through Monad Foundry in WSL2. Python commands use the isolated
`analytics/.venv` managed by `uv`.

## Data limitations

- Addresses are participants, not natural persons.
- First-seen means first observed inside this sample.
- D1 and return metrics are sample participation, not platform retention.
- The fixture is deliberately constructed and is not evidence of production product behavior.
- Owner-controlled resolution is a centralized trust boundary.
