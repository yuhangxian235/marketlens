# MarketLens — Final Submission Copy

---

## A. 50-Word Version

AI agents increasingly plan multiple onchain actions at once. A transaction simulator can verify each action individually — but it cannot determine whether the complete plan contradicts itself or exceeds the user's aggregate budget. MarketLens is a batch-level policy firewall that examines the Agent's entire plan before signing. Verified receipt hashes are attested on Monad Testnet.

---

## B. 150-Word Standard Version

AI agents increasingly plan multiple onchain actions at once. A transaction simulator can verify each action individually, but it cannot determine whether the complete plan contradicts itself or exceeds the user's aggregate constraints.

MarketLens introduces a batch-level policy firewall. It examines the Agent's entire proposed operation batch — not just one transaction at a time — catching contradictions and cumulative risks that single-transaction simulation silently misses.

Two representative risks: **Contradictory Intent** (two individually valid actions take opposite positions on the same market) and **Hidden Cumulative Spend** (each action stays under the per-action limit but the combined total exceeds the user's batch budget). Both pass simulation. Both fail batch-level policy.

MarketLens uses deterministic Moss simulation evidence and publishes only verified receipt hashes to Monad Testnet. Zero user Agent actions are signed or broadcast. The result is a verifiable, permanent record of policy enforcement — before any wallet is involved.

---

## C. 300-Word Detailed Version

**Problem**

AI agents are increasingly trusted to plan and prepare multiple onchain actions at once. A user might receive a batch of five proposed transactions — buys, claims, position adjustments — and be expected to review and sign them. Current tooling can simulate each transaction individually. This confirms that no single action will revert or violate a per-action rule. But it answers the wrong question.

**Why single-operation simulation is insufficient**

A simulator checks one transaction at a time. It cannot see that two individually safe actions contradict each other, or that individually reasonable amounts add up to a budget violation. The attack surface is the space *between* the actions — the batch-level relationships and cumulative effects that no per-transaction check can observe.

**What MarketLens does differently**

MarketLens introduces a batch-level policy firewall. It takes the Agent's entire proposed operation batch, evaluates it against a user-defined policy, and produces a structured batch receipt: per-proposal verdicts, batch-level rulings, and detailed reason codes. Two representative risks are built in:

- **Contradictory Intent**: Two valid actions take opposite positions on the same market. Both pass simulation. Both pass per-action rules. The firewall detects the contradiction and blocks one.
- **Hidden Cumulative Spend**: Each buy stays under the per-action payment limit. Together they exceed the user's total batch budget. Single-simulation approves both. The firewall rejects the batch.

The architecture is designed for protocol adapters; the reference implementation targets prediction markets.

**Why Monad**

MarketLens publishes verified batch receipt hashes to Monad Testnet via a project-controlled attestation contract. The attestation records only receipt hashes — no user data, no proposal content, no private keys. Zero user Agent actions are signed or broadcast. Monad provides the high-throughput, low-cost environment needed for frequent batch verification anchoring. The registry is live at `0x85AD7b41DC64d8E191A9Dc56B398068341c54203` with verified attestation on-chain.

**Safety**

- Zero user Agent actions signed or broadcast
- Project-controlled Monad Testnet attestation records only verified receipt hashes
- Local Anvil fixture only (no external RPC dependency for verification)
- Not deployed on Monad mainnet

---

## Safety Statement

> Zero user Agent actions are signed or broadcast. A project-controlled Monad Testnet transaction records only verified receipt hashes.

---

## Explorer Links

- Registry: [0x85AD…4203](https://testnet.monadexplorer.com/address/0x85AD7b41DC64d8E191A9Dc56B398068341c54203)
- Attestation TX: [0x6ab6…fe52](https://testnet.monadexplorer.com/tx/0x6ab6de991889f88fe5906fc0e679ca53eeb55e0369a34772c519a62ff477fe52)
