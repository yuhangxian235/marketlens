# URYZEN × MARKETLENS — MONAD-NATIVE AGENT INTEGRATION PROOF — FINAL REPORT

**Date:** 2026-08-08
**Branch:** `feat/uryzen-agent-integration-proof`
**Base SHA:** `9f75841a49e91dcc3fc8526d03e593d16b0c6df3`
**PR:** [#7](https://github.com/yuhangxian235/marketlens/pull/7)
**Verdict:** ✅ **FINAL GO**

---

## 1. Elapsed Time

~2.2 hours (within 3-hour limit)

## 2. Branch

`feat/uryzen-agent-integration-proof`

## 3. Base SHA

`9f75841a49e91dcc3fc8526d03e593d16b0c6df3`

## 4. Uryzen Full Contract

`0xdFBd38b6D5A233009b59Bb3b2831BC89663016C1` (BettingCore UUPS proxy)

## 5. Chain ID

**10143** (Monad Testnet)

## 6. Verified ABI Function

```
placeBetsBatch(uint256[] eventIds, uint8[] predictionIndices, uint256[] betAmounts) payable
```

## 7. Function Selectors (Keccak-256 via ethers.id())

| Function | Selector |
|----------|----------|
| placeBet | **0xda866c48** |
| placeBetsBatch | **0x4487dda7** |

Computed via `ethers.id()` = true Keccak-256 (not SHA3-256).

## 8. Real Reference Transaction Hash

**No reference Uryzen transaction hash was located within the recon time limit.**
Block height on Monad Testnet (51M+) made RPC transaction scanning infeasible in the 45-minute recon window.

Contract existence verified via `eth_getCode`.
Transaction structure verified via production JS bundle analysis (wagmi `writeContract`).
No claim of a reproduced or observed real Uryzen transaction is made.

## 9. Market Snapshot

- Event: "Who will win the 2027 French presidential election?"
- On-chain ID: 273
- Outcomes: 9 options
- Source: `https://uryzen.com/api/events/`

## 10. Agent Logic

`runUryzenAgent()` in `examples/uryzen-agent/src/agent.ts` — deterministic, reads market + config, generates bet intents.

## 11. Agent Isolation from MarketLens

**CONFIRMED.** Agent source contains zero references to `max_total_payment`, `max_payment_per_action`, or `batch`. Agent sizing comes from its own config.

## 12-13. Unsafe Bet A and B

- Bet A: 0.3 MON, predictionIndex 0 ("Edouard Philippe")
- Bet B: 0.3 MON, predictionIndex 1 ("Jordan Bardella")

## 14-15. Individual Results

- Bet A: PASS
- Bet B: PASS

## 16. Batch Result

**PARTIALLY_ELIGIBLE** (0.6 > 0.5)

## 17. Bet B Reason

**BATCH_TOTAL_PAYMENT_EXCEEDED** (from real MarketLens engine)

## 18. Original Batch Calldata Selector

`0x4487dda7` — verified via `verifySelector()`

## 19. Original Batch Contains A+B?

**YES** — both eventIds [273, 273] with predictionIndices [0, 1]

## 20. Original Batch Signed?

**NO**

## 21. Signer Call Count

**0** for original unsafe batch

## 22. Retry Result

**REFUSED** — signer call count still 0

## 23. Sanitized Plan

Bet A only (predictionIndex 0)

## 24. Sanitized Transaction Contains B?

**NO** — verified by decoding signed calldata: only predictionIndex 0 present

## 25. Sanitized Transaction Signed?

**YES** — locally, with ephemeral dev wallet

## 26. Positive Scenario Result

0.2 + 0.2 = 0.4 ≤ 0.5 → **ELIGIBLE**

## 27. Positive Original Batch Signed?

**YES** — locally signed

## 28. Broadcast Count

**0**

## 29. Public Blockchain Writes

**0**

## 30. Real Funds

**0**

## 31. Real Wallets

**0**

## 32. Secrets Committed

**0** — security scan passed. No PRIVATE_KEY, mnemonic, seed, API secret, or hardcoded hex keys.

## 33. New Tests

**22 passed** in `examples/uryzen-agent/tests/integration.test.ts`

## 34. Web Tests

**35 passed** — no regression

## 35. Foundry Tests

Local WSL environment limitation prevented direct Foundry execution. **PR CI independently completed all Foundry checks successfully** (Forge fmt, Forge build, Forge test, contract-tests — all SUCCESS).

## 36. Batch-Policy Tests

**12 passed** — no regression

## 37. Safe E2E

Requires anvil + PowerShell (local WSL limitation). No Safe contract changes were made.

## 38. Typecheck

**SUCCESS** (CI verified). Local pre-existing error in `e2e-safe-enforcement.test.ts` was not introduced by this PR.

## 39. Lint

**SUCCESS** (CI verified).

## 40. Build

**SUCCESS** — dependencies built, Next.js build passed (CI verified).

## 41. Commit SHAs

```
3b87814 — docs: correct Uryzen integration evidence
3a178de — docs: add Uryzen agent integration final report
edd5452 — test: prove ineligible Uryzen bets never reach signing
2307580 — feat: gate Uryzen batch signing with MarketLens policy
823071f — feat: add Uryzen prediction agent integration proof
```

## 42. PR Number

**#7**

## 42b. PR CI

Latest CI: **#31249248450 — SUCCESS**
Previous CI: **#31246404937 — SUCCESS**

All 9 jobs pass: contract-tests, Forge fmt, Forge build, Forge test, typecheck, lint, batch-policy tests, Live Lab tests, Next.js build.

## 43. PR URL

https://github.com/yuhangxian235/marketlens/pull/7

## 44. Main Modified?

**NO** — main at `9f75841a` unchanged

## 45. Git Status

Clean — all changes committed

---

# FINAL ANSWER

**Has MarketLens demonstrated, using Uryzen's real Monad Testnet transaction interface, that an independent prediction Agent can propose a Monad-native batch while MarketLens prevents an unsafe original batch from reaching signing?**

**YES.**

```
REAL URYZEN MARKET DATA (Event 273, Monad Testnet)
        ↓
INDEPENDENT AGENT (0.3 + 0.3 MON)
        ↓
REAL URYZEN placeBetsBatch CALLDATA (selector 0x4487dda7)
        ↓
MARKETLENS verifyBatch() → PARTIALLY_ELIGIBLE
        ↓
BET B: INELIGIBLE (BATCH_TOTAL_PAYMENT_EXCEEDED)
        ↓
ORIGINAL UNSAFE BATCH: SIGNING REFUSED (signer calls: 0)
        ↓
SANITIZED APPROVED PLAN: Bet A only
        ↓
NEW URYZEN TX: LOCALLY SIGNED
        ↓
BROADCAST: 0 | REAL FUNDS: 0 | REAL WALLET: 0
```

# ✅ FINAL GO

*Not merged. Awaiting review decision.*
