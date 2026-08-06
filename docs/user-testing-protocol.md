# User Testing Protocol — MarketLens

## Goal
Validate that users understand the **batch-level** difference between MarketLens and single-transaction simulation tools.

## Participants
5 users with Web3, AI agent, or general product background.

## Tasks (order fixed)

### Task 1: First impression (30s)
1. Open MarketLens homepage
2. Read the hero section silently for 10 seconds
3. State in your own words: "What does MarketLens do differently from a regular transaction simulator?"

### Task 2: Direction conflict (2 min)
1. Click "Live Local Lab →"
2. Click "Load direction conflict"
3. Read the two proposals
4. Predict: "Which proposal will be blocked and why?"
5. Click "Run fresh verification"
6. Check: Was your prediction correct?
7. Click "Resolve current risk"
8. Click "Run fresh verification" again
9. Observe: What changed?

### Task 3: Cumulative budget (2 min)
1. Click "Load cumulative budget risk"
2. Read the two proposals
3. Question: "Each proposal is under the per-action limit. Why might the batch still fail?"
4. Click "Run fresh verification"
5. Check the result
6. Click "Resolve current risk"
7. Click "Run fresh verification" again
8. Observe the difference

## Recording

For each participant, record:
- Did they understand the batch-level difference? (Y/N)
- Did they correctly predict the conflict result? (Y/N)
- Did they correctly explain cumulative budget failure? (Y/N)
- Did they independently complete Resolve? (Y/N)
- Total time for all tasks (min:sec)
- Main confusion point (free text)
- One quote (verbatim feedback)

## Template
See `docs/user-testing-results-template.md`
