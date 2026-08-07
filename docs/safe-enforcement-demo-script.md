# Safe Enforcement Killer-Proof Demo Script

**Duration:** ~20 seconds
**Format:** Terminal / Foundry test output showcase

---

## Scene 1 — APPROVED (4 sec)

```
$ forge test --match-test testA

[PASS] testA_ApprovedExecution()
  MarketLens: ALLOW
  Safe: EXECUTED
```

---

## Scene 2 — CUMULATIVE SPEND ENFORCEMENT (6 sec)

```
$ forge test --match-test testE2E_PolicyBlock

[PASS] testE2E_PolicyBlockDeniesApprovalSafeReverts()

ACTION A: INDIVIDUAL PASS
ACTION B: INDIVIDUAL PASS
BATCH TOTAL: 0.6 > 0.5

MARKETLENS BATCH STATUS: PARTIALLY_ELIGIBLE
ACTION B: INELIGIBLE
REASON: BATCH_TOTAL_PAYMENT_EXCEEDED

APPROVAL FOR ACTION B: DENIED
AGENT STILL ATTEMPTS EXECUTION: YES
SAFE: REVERTED
STATE CHANGE: NONE
```

---

## Scene 3 — TAMPERED (4 sec)

```
$ forge test --match-test testC

[PASS] testC1_TamperedValue()    — ValueMismatch
[PASS] testC2_TamperedTarget()   — TargetMismatch
[PASS] testC3_TamperedCalldata() — CalldataMismatch

  MarketLens: ALLOW original
  Agent: MODIFIED transaction
  Safe: REVERTED (all 3 variants)
```

---

## Scene 4 — Forward Path (2 sec)

```
[PASS] testE2E_WithinBudgetApprovalIssuedSafeSuccess()
  0.2+0.2 <= 0.5 -> ELIGIBLE -> APPROVAL ISSUED -> SAFE SUCCESS
```

---

## Scene 5 — Narration (4 sec)

"Both actions pass individually —
but cumulative spending makes Action B ineligible.

MarketLens denies the execution approval.
The Agent still attempts execution.
The Safe Guard rejects it.

MarketLens does not just warn the Agent —
it controls what reaches execution."

---

## Static End Card

```
64 Foundry Tests PASSED
  - 53 existing Hackathon tests
  - 9 Safe enforcement tests
  - 2 E2E closure tests

35 Web Tests PASSED
CI Green

LOCAL ANVIL ONLY — NO REAL FUNDS — NOT PRODUCTION
```
