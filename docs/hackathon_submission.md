# MarketLens — Hackathon Submission

## 1. Problem
Onchain analytics dashboards tell you what happened. But when a user or agent wants to act — buy a position, claim a reward — there is no verification that the action matches their intent before they sign. Wrong market, wrong outcome, wrong amount: these are discovered only after gas is spent.

## 2. Solution
MarketLens connects product analytics to Moss-powered trace simulation. A user sees the data, forms an intent, simulates the exact transaction locally, inspects every change in a structured receipt, and verifies their constraints — all **unsigned and not broadcast**.

## 3. Innovation
- **Receipt-first architecture**: Structured, ordered Change interpretation before execution
- **Transparent intent checking**: 7 individual rules (buyer_matches, outcome_matches, payment_within_limit…), not a black box score
- **Deterministic action construction**: Moss capabilities produce the same calldata every time
- **State unchanged proof**: Simulation does not alter any onchain state

## 4. Why Monad
Prediction markets on Monad benefit from high throughput and low fees. MarketLens is designed to index Monad prediction market events and provide product analytics. Current demo runs on local Anvil (chain 143); the contract is deployable on Monad testnet.

## 5. Why Moss
Moss provides the verifiable action layer: capability discovery, deterministic transaction construction, trace simulation, structured receipt parsing. Without Moss, each of these would need to be built from scratch.

## 6. Technical Architecture
See `docs/judge_architecture.md`

## 7. Demo Flow
Open `/demo?mode=present` — 8 steps, ~2.5 minutes:
Evidence → Insight → Intent → Action → Simulation → Receipt → Checks → Status

## 8. Current Limitations
- No Monad connection (local Anvil only)
- No wallet signing or broadcasting
- Analytics data is a local demo sample, not production data

## 9. Future Roadmap
1. Monad testnet fork verification
2. Wallet integration (signing + broadcast)
3. Real-time event indexing
4. MCP composition for agent integration

## 10. Team
Yuhang Xian — CUIT Blockchain Engineering 2027
Full-stack: Solidity, Foundry, Go indexing, Python analytics, TypeScript/Next.js, Moss Protocol integration

