# Polymarket Public Read-Only API Research

## Access Date
2026-07-25 (APIs unreachable from current network; research based on official documentation)

## Network
Polymarket operates on Polygon PoS (chain 137) using CTF (Conditional Token Framework).

## Public Read-Only APIs (no auth required)

### 1. Gamma API — Market Discovery
- Base: https://gamma-api.polymarket.com
- GET /events — list events
- GET /markets — list markets (with filters: closed, liquidity, volume, tag)
- GET /markets/{id} — single market details

### 2. CLOB API — Orderbook
- Base: https://clob.polymarket.com
- GET /book?token_id={id} — orderbook snapshot (bids/asks)
- GET /midpoint?token_id={id} — midpoint price
- GET /price?token_id={id}&side={BUY|SELL} — estimated price
- GET /order/{id} — order status (public)
- GET /tick-size?token_id={id} — tick size

### 3. Data API — Historical
- Base: https://data-api.polymarket.com
- GET /markets — historical market data
- GET /trades — trade history

## Auth-Required Endpoints (NOT USED in this phase)
- POST /order — submit order (requires API key + EIP-712 signature)
- DELETE /order/{id} — cancel order
- DELETE /orders — cancel all
- GET /orders — user's open orders

## Key Concepts

### Token ID
Each outcome in a market has a unique token_id (ERC-1155). Binary markets: YES token + NO token.

### Order Structure (EIP-712)
- tokenID: which outcome
- price: in cents (0.01 = 1 USDC cent)
- size: number of shares
- side: BUY or SELL
- feeRateBps: maker/taker fee
- nonce, expiration, takerAmount, makerAmount

### Neg Risk Markets
Some markets use neg risk where mutually exclusive outcomes are bundled.

### Market States
- ACTIVE: trading open
- CLOSED: trading ended, pending resolution
- RESOLVED: outcome determined

## Shadow Simulation Boundary (this phase)
- READ: Gamma markets, CLOB orderbook, token prices
- SIMULATE: local orderbook replay to estimate fill
- DO NOT: submit orders, cancel orders, use auth endpoints
- DO NOT: simulate Polygon onchain settlement
- DO NOT: claim Polymarket accepted the order

## Difference from Monad/Moss EVM Simulation
| Aspect | Polymarket Shadow | Monad/Moss EVM |
|--------|------------------|----------------|
| Network | Polygon PoS (read-only) | Local Anvil |
| Data | Live CLOB + Gamma API | Contract events |
| Simulation | Orderbook replay | debug_traceCall |
| Output | Estimated fill | Ordered Receipt |
| Settlement | NOT simulated | Simulated via trace |
