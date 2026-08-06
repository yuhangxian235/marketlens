# 90-Second Demo Script — MarketLens

## 0–10s: The Problem
> "AI Agents often propose several operations at once."
> *Show: Agent batch with multiple proposals*

## 10–20s: Why Single-Sim Isn't Enough
> "Individual transactions can be valid while the overall plan violates the user's intent."
> *Show: Two proposals — both individually safe*

## 20–45s: Direction Conflict
> *Click "Load direction conflict"*
> "Both pass simulation. Both pass per-action policy. But they take opposite positions on the same market."
> *Run verification*
> "MarketLens detects the batch-level conflict. One eligible, one blocked."
> *Show: BATCH_POLICY_CONFLICT*

## 45–58s: Resolve
> "The user resolves the conflict by aligning outcomes."
> *Click Resolve, re-run*
> "Fresh evidence. Both now eligible. Zero blocked."

## 58–70s: Cumulative Budget
> *Click "Load cumulative budget risk"*
> "Each buy is under the per-action limit. But combined, they blow through the batch budget."
> *Run verification*
> "Batch policy catches the total — BATCH_TOTAL_PAYMENT_EXCEEDED."

## 70–82s: Monad Attestation
> "Verified batch receipts are attested on Monad Testnet."
> *Show: Registry address, receipt hash, explorer link*
> "Only hashes are recorded. No user agent actions are executed."

## 82–90s: Closing
> "MarketLens is not another transaction explainer. It is a policy firewall for the Agent's entire plan."
> *Show: UNSIGNED / NOT BROADCAST / NOT DEPLOYED ON MONAD badges*
