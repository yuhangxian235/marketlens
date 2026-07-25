# Product case study

## Status

Phase 1 engineering case study backed by one deterministic local-fork fixture. The measured
values demonstrate reproducibility and metric semantics, not production demand.

## Problem observed

Prediction-market teams need more than volume:

- wallet-level first-seen and repeat participation;
- cross-market discovery behavior;
- explicit sample and data-quality limits;
- evidence that an Agent-prepared action matches user constraints.

## Evidence hierarchy

1. **On-chain fact** — backed by canonical event keys, block range and query;
2. **Product interpretation** — explains possible business meaning;
3. **Hypothesis to validate** — plausible cause, explicitly unproven;
4. **Experiment** — intervention, primary metric and guardrails.

## Analysis questions

### Acquisition surface

- Which market receives the most deterministic first-touch wallets?
- What share of those wallets joins only that market?

Possible interpretation: one market may attract sample-first wallets but fail to expose the rest of the product.

Hypothesis: a post-purchase related-market module increases qualified cross-market continuation.

### Repeat participation

- What share of eligible first-seen wallets returns on the next complete UTC day?
- How does this vary by first-touch market?

Possible interpretation: some market topics may create a one-off task rather than a repeat habit.

Hypothesis: watchlists or resolution reminders increase later sample participation.

### Cross-market discovery

- How many wallets join 1 versus 2+ markets?
- Which market pairs have the largest overlap/Jaccard?
- Which chronological A→B paths appear in the sample?

Possible interpretation: market taxonomy or recommendation placement may shape discovery.

Hypothesis: contextual recommendations outperform a generic trending list.

## Recommended first experiment

Intervention:

- after a successful `buyPosition`, show one related unresolved market;
- control shows the current completion state only.

Primary metric:

- qualified A→B continuation within the fixed sample horizon.

Guardrails:

- reverted/failed transaction rate;
- median payment amount;
- time to complete the first purchase;
- YES/NO mix;
- warning or constraint-check failure rate.

Decision rule:

- define minimum detectable effect and sample size before running;
- do not declare causality from an observational comparison;
- report wallet-level results, not “users”.

## Fixture facts

All values below belong to one generated `analysis_run_id`, blocks
`90057010–90057042`, and six address-level participants:

- 12 `PositionBought` events across three markets;
- 6 distinct participating wallets;
- 5/6 wallets joined at least two markets;
- 5/6 appeared again later in the sample;
- 4/6 D1-eligible wallets appeared on the next complete UTC day;
- first-touch distribution: Market 1 = 2, Market 2 = 3, Market 3 = 1;
- 26 decoded contract events with zero decode errors and 6/6 critical checks passing.

These are fixture facts, not claims about real product behavior.

## Data limitations

- wallet ≠ person;
- sample-first ≠ new user;
- repeat participation ≠ retention;
- local fixture behavior ≠ real market demand;
- manually designed demo sequences cannot support product conclusions;
- admin resolution is centralized;
- selection of markets and blocks controls external validity.

## Evidence criteria

- all numeric facts link to one valid `analysis_run_id`;
- every fact has SQL, pandas check and sample hashes;
- hypotheses use non-causal language;
- experiments define primary and guardrail metrics;
- limitations remain visible in the portfolio UI.
