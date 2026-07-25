# 3-Minute Demo Script

## 0:00–0:20 — Problem
> "Analytics tells us what happened, but not whether an onchain action matches the user's intent."

- Open /demo
- Explain: prediction markets have real money at stake
- The gap: data → insight → action verification

## 0:20–0:45 — Evidence (Steps 1-2)
- Show local demo sample analytics
- Unique wallets observed (emphasize: addresses, not persons)
- Open Evidence drawer: show SQL definition, sample window, limitations
- Product insight: "Market 1 has strongest observed participation"

## 0:45–1:05 — Intent (Steps 3-4)
- User selects: Buy YES on Market 1, max 1,000,000,000 wei
- Show intent parameters
- Show Moss Action: capability, protocol, method
- Show manual builder match confirmation

## 1:05–1:35 — Simulation (Steps 5-6)
- debug_traceCall on local Anvil chain 143
- reverted = false, warnings = 0
- Ordered Changes: nativeTransfer + PositionBought
- Receipt: all Changes covered, order preserved

## 1:35–2:10 — Verification (Steps 7-8)
- Intent checks: 7/7 passed
- buyer/marketId/outcome/payment/stake all match
- State unchanged: block, balance, nonce, stake all preserved
- "LOCAL SIMULATION PASSED"

## 2:10–2:35 — What This Means
- Not a real transaction
- No wallet signing
- No broadcasting
- Local Anvil only
- But: the calldata, simulation, and intent checks are REAL

## 2:35–2:50 — Optional: failure scenario
- Switch to losing_claim
- Show SIMULATION BLOCKED, DO NOT SIGN

## 2:50–3:00 — Conclusion
> "Evidence before recommendation. Simulation before signing. Receipt before trust."

