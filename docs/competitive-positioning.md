# Competitive Positioning — MarketLens

## Three Layers of Agent Safety

| Layer | Question | Tool Example | What It Detects |
|-------|----------|-------------|-----------------|
| **1 — Transaction Simulation** | Will this transaction execute? | Tenderly, Anvil `debug_traceCall` | Reverts, gas errors, assertion failures |
| **2 — Action-Level Safety** | Does this action obey a single rule? | Per-action allow/deny lists | Unauthorized capability, wrong outcome, over-spend per action |
| **3 — MarketLens Batch Policy** | Does the entire Agent plan remain coherent and within aggregate constraints? | MarketLens | Cross-action contradictions, cumulative budget violations, batch-level intent mismatch |

**MarketLens operates at Layer 3 while still consuming evidence from Layers 1 and 2.**

## Why Layers 1 and 2 Are Not Enough

```
Action A → SIMULATION PASS → ACTION-LEVEL PASS ─┐
                                                  ├→ BATCH-LEVEL RISK → BLOCKED
Action B → SIMULATION PASS → ACTION-LEVEL PASS ─┘
```

Two transactions can each pass simulation and each obey per-action rules — yet the combined plan still violates the user's intent. No Layer 1 or Layer 2 tool can see this, because the problem exists *between* the actions.

## Two Representative Batch-Level Risks

### Contradictory Intent
- **What**: Two valid actions take opposite positions on the same market.
- **Layer 2 sees**: Two individually valid buy orders.
- **Layer 3 sees**: A contradictory plan. One of them should not proceed.

### Hidden Cumulative Spend
- **What**: Each action stays under the per-action limit. Combined, they exceed the user's total batch budget.
- **Layer 2 sees**: Two compliant spends.
- **Layer 3 sees**: Total spend exceeds aggregate constraint. Batch blocked.

## Positioning Statement

> MarketLens does not compete with transaction simulators. It adds the missing layer — verifying that the complete Agent plan, not just individual actions, respects the user's aggregate intent.
