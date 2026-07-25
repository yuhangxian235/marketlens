# Judge FAQ

[Questions 1-15 from Phase 3A preserved. New additions:]

## 16. Why not just use Polymarket's existing UI?
Polymarket shows markets and lets you trade. It does not provide product analytics, structured simulation receipts, or transparent intent verification. MarketLens adds a verification layer that existing UIs don't offer.

## 17. Why does prediction market analysis need an Agent?
When users move from "looking at data" to "taking action", they need confidence that the action matches their intent. An agent that can simulate, verify, and only then propose execution bridges analytics and action safely.

## 18. Why is Receipt more important than transaction hash?
A transaction hash tells you a transaction happened. A Receipt tells you what happened — which events fired, what changed, in what order, and whether it matches expectations. For verification, structure matters more than existence.

## 19. What if simulation passes but real transaction fails?
This can happen due to state changes between simulation and execution (front-running, timeouts). MarketLens reduces the risk surface by verifying intent before signing, but does not eliminate all failure modes. This is an inherent limitation of any simulation-based approach.

## 20. What if the user's intent itself is wrong?
MarketLens verifies that the simulated outcome matches the stated intent. It does not judge whether the intent is a good decision. Product analytics inform the intent; verification validates it. The decision remains the user's.

## 21. Why simulate instead of just sending the transaction?
Sending costs gas. If the transaction reverts, gas is lost. Simulating first catches errors (wrong market, insufficient balance, closed market, already claimed) before any cost is incurred.

## 22. How do you connect to Monad in the future?
Phase 2C: fork Monad testnet, deploy the same contract, verify Moss simulation produces identical results. Phase 3: add wallet connection, signing, and broadcasting behind the existing verification layer.

