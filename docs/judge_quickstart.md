# Judge Quick-Start Guide

Time budget: 3 minutes.

## 30-second launch

```bash
pnpm install --frozen-lockfile
pnpm --filter @marketlens/web dev --port 3300
```

Open <http://localhost:3300>. You will see a single-page five-step firewall demo. No wallet, no signer, no broadcast — all evidence is pre-generated local Moss + Anvil output, re-verified in the browser.

## What to look for (in order)

### Step 1 — Proposals
Five synthetic Agent proposals appear. The Agent is deterministic and policy-blind — it proposes, it does not approve.

### Step 2 — Policy
Three presets: **Strict**, **Default**, **Permissive**. Toggle between them to see how the same five proposals produce different verdicts:

| Preset | Eligible | Blocked | Key difference |
| --- | --- | --- | --- |
| Strict | 1 | 4 | Low limits (0.10 MON/action), conflicts blocked |
| Default | 2 | 3 | Moderate limits (0.50 MON), conflicts blocked |
| Permissive | 4 | 1 | High limits (10.00 MON), opposing positions allowed |

### Step 3 — Moss Evidence Verification
Five pre-generated receipts are revealed. Each was produced by real local `@themoss/simulator` + Anvil `debug_traceCall` (chain 143), not a frontend mock. The browser re-verifies 60 Web Crypto integrity conditions before unlocking this step.

### Step 4 — Receipts
Two receipts that prove the product:
- **prop-003**: Decoded `NothingToClaim` revert from a losing-side claim — this is real onchain execution evidence, not simulated failure
- **prop-005**: `SIMULATION PASS` / `ACTION LEVEL PASS` / `BATCH LEVEL BLOCKED` — the batch firewall catches a conflict invisible to single-action simulation

### Step 5 — Verdict
The final verdict: `2 OF 5 ACTIONS ELIGIBLE` (Default policy). Three real blocking reasons: payment limit exceeded, simulation reverted, batch-level conflict. `0 Signed`, `0 Broadcast`.

## Safety boundaries (on every screen)

- `SYNTHETIC AGENT PROPOSAL`
- `REAL LOCAL`
- `UNSIGNED`
- `NOT BROADCAST`
- `NOT DEPLOYED ON MONAD`

## Technical deep-dive

- Full audit: `docs/phase4a-batch-implementation-audit.md`
- Architecture diagram: `docs/judge_architecture.md`
- FAQ: `docs/judge_faq.md`
- Screenshots: `artifacts/champion-audit/final/` (4 judge-facing screenshots in `docs/assets/demo/`) `artifacts/champion-audit/final/`
