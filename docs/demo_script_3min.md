# 90-Second Champion Demo Script

## 0:00–0:12 — The problem

> “An onchain action can be safe alone and unsafe inside an Agent batch. MarketLens stops that batch before a wallet signs.”

- Open the root route directly.
- Point out `SYNTHETIC AGENT PROPOSAL`, `REAL LOCAL`, `UNSIGNED`, `NOT BROADCAST`, and `NOT DEPLOYED ON MONAD`.

## 0:12–0:25 — Five Agent proposals

- Show five intents created by the deterministic, policy-blind planner.
- Do not reveal the final verdict yet.
- Say: “The Agent may propose. It does not approve or send.”

## 0:25–0:38 — User policy

- Show the 0.5 MON limits, required evidence, fail-closed behavior, and opposing-outcome conflict rule.
- Say: “The user—not the Agent—defines what can survive.”

## 0:38–0:52 — Moss execution evidence

- Reveal the five published Moss execution receipts.
- Point to `@marketlens/moss-prediction-market`, `@themoss/simulator`, `debug_traceCall`, and chain 143.
- Say: “These receipts were generated through real local Moss and Anvil, then re-verified in this browser. This animation is evidence reveal, not a fake frontend simulation.”

## 0:52–1:08 — Two receipts that prove the product

- Select `prop-003`: show decoded `NothingToClaim` plus raw `debug_traceCall` output.
- Select `prop-005`: show `SIMULATION PASS`, `ACTION LEVEL PASS`, `BATCH LEVEL BLOCKED`.
- Say: “Moss proves execution truth. The batch firewall adds user context that a single-action simulator cannot see.”

## 1:08–1:22 — Final verdict

- Show `2 OF 5 ACTIONS ELIGIBLE`.
- Read the three real reasons: payment limit, simulation revert, batch conflict.
- Point to `0 Signed` and `0 Broadcast`.

## 1:22–1:30 — Close

> “Let the Agent propose. Let Moss prove. Let the user’s policy decide—before the wallet signs.”

## Demo safety boundary

- Synthetic Agent proposals
- Real local Anvil evidence, not Monad deployment
- No wallet, private key, signing, broadcast, or execution feature
