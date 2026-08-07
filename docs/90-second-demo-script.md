# 90-Second Demo Script — MarketLens

**Total target: 80–95 seconds.**

---

## 0–8s: The Problem

> "AI Agents rarely act only once. They plan several operations together."

*Show: Agent batch with multiple proposals visible on screen.*

---

## 8–18s: The Key Insight

> "A simulator can approve every transaction individually and still miss that the overall plan contradicts the user's intent."

*Show: Two proposals — both marked SIMULATION PASS.*

---

## 18–42s: Contradictory Intent

*Click "Contradictory Intent" → Run fresh verification.*

> "Both actions are valid alone. Together, they contradict each other — opposite positions on the same market."

*Show:*
- *Action A: SIMULATION PASS, ACTION-LEVEL PASS*
- *Action B: SIMULATION PASS, ACTION-LEVEL PASS*
- *Batch verdict: 1 eligible / 1 blocked — BATCH_POLICY_CONFLICT*

> "The simulator saw two safe transactions. The firewall saw one unsafe plan."

*Human-readable: "Two individually valid actions take opposite positions on the same market."*
*Technical code: BATCH_POLICY_CONFLICT*

---

## 42–55s: Resolve

*Click "Resolve current risk" → re-run verification.*

> "The user aligns the outcomes. Fresh evidence. Both now eligible, zero blocked."

*Show: 2 eligible / 0 blocked.*

---

## 55–70s: Hidden Cumulative Spend

*Click "Hidden Cumulative Spend" → Run fresh verification.*

> "Each action stays under the per-action limit. But together they exceed the user's total budget."

*Show:*
- *0.3 MON + 0.3 MON*
- *Both under per-action ceiling*
- *Combined exceeds 0.5 MON batch budget*
- *BATCH_TOTAL_PAYMENT_EXCEEDED*

> "Single-simulation was fine with both. The batch firewall was not."

*Human-readable: "Each action stays under the per-action limit, but together they exceed the user's total budget."*
*Technical code: BATCH_TOTAL_PAYMENT_EXCEEDED*

---

## 70–83s: Monad Attestation

> "MarketLens does not broadcast the user's Agent actions. It anchors only the verified receipt hashes on Monad Testnet."

*Show:*
- *Registry: 0x85AD…4203*
- *Receipt hash*
- *Attestation TX*
- *Explorer link*

> "A permanent, verifiable record — without executing a single user transaction."

---

## 83–90s: Closing

> "MarketLens is not another transaction explainer. It is a firewall for the Agent's entire plan — BEFORE anything reaches a wallet."

---

## Engineering Proof (below the fold, small print)

- 35 Web tests, 10 Batch-policy tests, 53 Foundry tests — all pass
- Typecheck, lint, CI all green
- Monad Testnet attestation: [Registry](https://testnet.monadexplorer.com/address/0x85AD7b41DC64d8E191A9Dc56B398068341c54203) | [TX](https://testnet.monadexplorer.com/tx/0x6ab6de991889f88fe5906fc0e679ca53eeb55e0369a34772c519a62ff477fe52)
