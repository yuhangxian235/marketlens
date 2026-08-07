# 90-Second Demo Script — MarketLens

**Total target: 80–90 seconds. Narration: 190–205 words.**

---

## 0–10s: The Problem

> "AI Agents rarely act only once. They plan several operations together. The problem is simple: safe transactions can still form an unsafe plan."

---

## 10–20s: The Difference

> "Traditional simulation checks transactions one at a time. MarketLens checks the entire Agent batch before anything reaches a wallet."

---

## 20–43s: Contradictory Intent

*Click "Contradictory Intent" → Run fresh verification.*

> "Here, both actions simulate successfully and pass their individual checks. But they take opposite positions on the same market. Both actions pass individually. But together, they form an unsafe plan. MarketLens catches the batch-level conflict and blocks one of them immediately."

*Show: 1 eligible / 1 blocked — BATCH_POLICY_CONFLICT.*

---

## 43–55s: Resolve

*Click "Resolve current risk" → Run fresh verification.*

> "Now I align the second action's outcome and run fresh verification again. The batch is now coherent: two eligible, zero blocked."

---

## 55–68s: Hidden Cumulative Spend

*Click "Hidden Cumulative Spend" → Run fresh verification.*

> "MarketLens also catches cumulative risk that no single-action check can see. Each action spends 0.3 MON and passes individually, but together they exceed the 0.5 MON batch budget. Two safe transactions, one unsafe plan."

*Show: BATCH_TOTAL_PAYMENT_EXCEEDED.*

---

## 68–82s: Monad Proof

> "After verification, MarketLens creates a structured receipt. Only the receipt hashes are anchored to Monad Testnet — a permanent, independently verifiable proof that does not broadcast the user's Agent actions."

*Show: Registry, Attestation TX, Explorer.*

---

## 82–90s: Closing

> "MarketLens is not another transaction explainer. It is a firewall for the Agent's entire plan — before signing, before broadcast, before disaster."

*Static overlay: 35 Web Tests | 53 Foundry Tests | CI Passing | Monad Testnet Attestation.*

---

## Recording Shot List

| Shot | Content | Duration |
|------|---------|----------|
| 1 | Homepage hero — tagline + subheadline | 3 sec |
| 2 | Contradictory Intent loaded — two proposals visible | 5 sec |
| 3 | Both action-level PASS indicators | 5 sec |
| 4 | Batch BLOCK result — BATCH_POLICY_CONFLICT | 8 sec |
| 5 | Resolve — second outcome aligned | 5 sec |
| 6 | Fresh rerun → 2 eligible / 0 blocked | 8 sec |
| 7 | Hidden Cumulative Spend — 0.3 + 0.3 > 0.5 | 10 sec |
| 8 | Monad Attestation panel — hashes + registry | 6 sec |
| 9 | Monad Explorer TX confirmation | 6 sec |
| 10 | Final hero — tagline + safety overlay | 5 sec |
