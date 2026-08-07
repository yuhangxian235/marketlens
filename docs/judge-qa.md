# Judge Q&A — MarketLens

---

## 1. What makes MarketLens different from a normal transaction simulator?

A simulator checks one transaction at a time: will it execute? MarketLens checks the entire Agent batch: does the complete plan contradict itself or exceed aggregate constraints? It's a batch-level firewall, not a per-transaction debugger.

---

## 2. Why can't you just simulate each transaction independently?

Because the risk lives between the actions. Two individually safe transactions can contradict each other or add up to a cumulative budget violation. Per-transaction simulation has no concept of "the batch."

---

## 3. What role does Moss play?

Moss provides deterministic execution evidence — it simulates each proposed action and returns structured traces. MarketLens consumes that evidence and evaluates it against the user's batch-level policy.

---

## 4. What role does Monad play?

Monad Testnet is the public verification anchor. After MarketLens evaluates a batch, only the receipt hashes are published to a registry on Monad — creating an independently verifiable audit trail. No user actions execute on Monad.

---

## 5. Why publish hashes instead of executing the actions on Monad?

Because the user's actions are never signed or broadcast — this is a pre-sign verification tool. Publishing hashes provides a tamper-evident record of what was verified, without risking user funds or executing a single transaction.

---

## 6. Are user transactions signed?

No. Zero user Agent actions are signed, broadcast, or executed by MarketLens.

---

## 7. Does MarketLens control user funds?

No. MarketLens has no wallet, holds no funds, and cannot initiate transactions. It is a read-only policy verification layer.

---

## 8. Why prediction markets?

Prediction markets provide a clean, two-outcome model with clear financial constraints — ideal for demonstrating batch-level risks like contradictory positions and cumulative spending. The architecture is designed for protocol adapters.

---

## 9. Is this limited to prediction markets?

No. The batch-policy engine is protocol-agnostic. Prediction markets are the reference implementation. Adapters for other protocols (DEX, lending, staking) would follow the same pattern.

---

## 10. What happens if simulation evidence is missing?

MarketLens fails closed. If Moss cannot produce evidence for an action, that action is not eligible — the policy's `require_simulation_success` rule blocks it. Silent approval with missing evidence is not an option.

---

## 11. Why is cumulative budget a batch-level problem?

A per-action budget check only sees one transaction's cost. It cannot know that three individually reasonable spends add up to more than the user is willing to risk in total. Batch-level evaluation is the only place where the sum exists.

---

## 12. Why isn't an LLM enough to detect these conflicts?

LLMs can reason about intent but cannot produce deterministic, verifiable execution evidence. MarketLens combines Moss's deterministic simulation with policy evaluation — the result is reproducible, auditable, and doesn't depend on prompt engineering.

---

## 13. What prevents the Agent from bypassing MarketLens?

MarketLens is positioned before the signing step. It produces an unsigned allowlist — only proposals on that list should proceed to the wallet. The signing tool enforces the boundary. MarketLens itself does not control the wallet.

---

## 14. Is this production ready?

No. This is a hackathon prototype and reference implementation. It demonstrates the architecture with two batch-level risk examples, local simulation, and Monad Testnet attestation. Production deployment would require protocol adapter hardening, key management integration, and audit.

---

## 15. What's the next step after the hackathon?

Three priorities: (1) add a second protocol adapter to demonstrate generality, (2) integrate with a real signing flow (wallet-level allowlist enforcement), (3) expand the policy DSL to cover more batch-level constraint types.
