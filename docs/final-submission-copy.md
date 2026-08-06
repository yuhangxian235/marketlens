# MarketLens — Final Submission Copy

## Tagline
**Safe transactions can still form an unsafe plan.**

## One-liner
MarketLens is a batch-level policy firewall that detects risks across an Agent's entire operation batch — not just one transaction at a time.

## What it does
AI agents can prepare multiple transaction actions faster than users can manually inspect them. MarketLens inserts a deterministic policy and evidence-verification layer that examines the *combination* of proposed actions — catching direction conflicts, cumulative budget violations, and cross-market risks that single-transaction simulators miss.

## Key features
- **Batch-level policy firewall** — examines the full Agent proposal batch, not individual transactions
- **Two batch-only risk examples** — Direction Conflict and Cumulative Budget, both silently missed by single-action simulators
- **Live Local Lab** — focused two-action fresh evidence generation using local Anvil debug_traceCall
- **Verified Demo** — five-action pre-generated Moss evidence with three selectable policies
- **Monad Testnet attestation** — project-controlled hash publication of verified batch receipts
- **Offline CI** — 35 Web tests, 10 Batch-policy tests, 53 Foundry tests, typecheck, lint, build

## What it is NOT
- A wallet, swap tool, or transaction explainer
- A natural language trading assistant
- An automated execution agent
- A cross-chain product
- Production-deployed or protecting real user funds

## Reference implementation
Prediction markets (Monad Testnet adapter) — the batch-policy architecture is designed for future protocol adapters.

## Safety
- Zero user Agent actions signed or broadcast
- Project-controlled Monad Testnet attestation records only verified receipt hashes
- Local Anvil fixture only (no external RPC dependency for verification)
- Not deployed on Monad mainnet
