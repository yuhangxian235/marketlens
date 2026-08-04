# Final Pitch

## 30-Second Pitch

> MarketLens is a pre-sign policy firewall for Onchain Agent batches. The Agent proposes; Moss proves what each action would do; the user’s policy decides what survives. Our core case passes Moss and every action-level rule, then gets blocked because the full batch contains a conflicting action. Five proposed. Two eligible. Three blocked. Zero signed. Zero broadcast.

## 90-Second Pitch

> AI Agents are getting better at preparing onchain transactions, but users still need a clear control point before signing. Existing simulators usually answer one question at a time: will this transaction execute? They do not answer whether several individually valid actions are safe together under one user policy.
>
> MarketLens adds that missing batch layer. First, a deterministic policy-blind Agent planner produces five unsigned proposals. Second, the user policy defines payment limits, allowed capabilities, required evidence, and conflict rules. Third, every proposal is paired with real local Moss and Anvil `debug_traceCall` evidence. Fourth, the engine creates canonical Action Receipts. Finally, it evaluates the whole set and creates a Batch Receipt.
>
> The result is not a mocked verdict. `prop-002` is blocked for exceeding the user’s payment limit. `prop-003` is blocked by a real `NothingToClaim` revert. `prop-005` is the key innovation: it passes Moss and action-level policy, but the batch engine blocks it because it conflicts with `prop-004` on the same market.
>
> The final result is five proposed, two eligible, three blocked, zero signed, and zero broadcast. The current evidence runtime is local Anvil, not Monad. The product direction is Monad Agent batches, where fast autonomous execution makes a trustworthy pre-sign firewall even more important.

