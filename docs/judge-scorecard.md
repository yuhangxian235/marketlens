# Hackathon Judge Scorecard — MarketLens

*Self-assessment against hackathon judging criteria. Scores are honest; no dimension receives a perfect score.*

---

| Dimension | Score | Status | Evidence | Weakness | One More Improvement |
|-----------|-------|--------|----------|----------|---------------------|
| **Problem clarity** | 8/10 | Strong | Tagline, 50/150/300-word submission copy, 3-layer competitive positioning | Could be tested with non-technical judges | Record actual user-testing Q1 results |
| **Differentiation** | 8/10 | Strong | 3-layer framework (Simulation → Action → Batch), competitive-positioning.md | Competitors may also claim "batch-level" without implementing it | Add protocol adapter skeleton to show generality |
| **Monad relevance** | 7/10 | Good | Live registry `0x85AD…4203`, verified attestation TX, explorer proof | Attestation is hash-only; no Monad-native execution | Expand attestation to include policy hash + timestamp anchoring |
| **Moss relevance** | 8/10 | Strong | Deterministic simulation evidence consumed by batch engine, fail-closed on missing data | Moss is an external dependency; MarketLens adds value on top | Add second Moss adapter (non-prediction-market) |
| **Working product** | 7/10 | Good | Web UI with live verification, 35 tests, typecheck, build passes | Live Lab requires local Anvil; not fully self-contained | Containerize the full stack for one-command judge launch |
| **Demo quality** | 8/10 | Strong | 90-second script, Contradictory Intent + Hidden Cumulative Spend cases, Monad attestation proof visible | No judge-mode guided flow | Add lightweight step navigation (see judge-mode assessment) |
| **Technical credibility** | 7/10 | Good | 53 Foundry tests, 10 batch-policy tests, 35 web tests, CI green, deterministic reproducibility | Solidity is minimal (registry only); most logic in TypeScript | Add batch-policy formal specification |
| **User validation** | 3/10 | Early | User-testing protocol defined, questions structured | No actual test results yet | Run 3 real judge test sessions |
| **Safety boundaries** | 9/10 | Excellent | Unsigned, not broadcast, no wallet, no funds, fail-closed, explicit safety copy on every page | Relies on external signing tool for enforcement | Document the signing-tool integration boundary explicitly |
| **Future extensibility** | 6/10 | Adequate | Protocol adapter pattern, policy DSL is declarative, batch engine is adapter-agnostic | Only one adapter implemented; no second protocol to prove generality | Add DEX swap adapter skeleton |

---

## Summary

| Aggregate | Value |
|-----------|-------|
| Total score | 71/100 |
| Strongest dimension | Safety boundaries (9/10) |
| Weakest dimension | User validation (3/10) |
| Most impactful next step | Record real judge test sessions |

---

## Honest Assessment

MarketLens demonstrates a genuine insight — that agent safety requires batch-level reasoning, not just per-transaction checks — and backs it with working code, deterministic evidence, and on-chain attestation. The two risk examples are clear and reproducible.

The primary weakness is that **no real user has validated the product experience**. This is the highest-impact pre-submission improvement.
