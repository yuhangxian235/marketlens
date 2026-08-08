# Polymarket Agent Integration Research

**Date:** 2026-08-08
**Access method:** curl to Gamma API + CLOB API (read-only)

## 1. CLOB Client
- **Package:** `@polymarket/clob-client` v5.8.1
- **Chain:** Polygon (chainId: 137)
- **CLOB API:** https://clob.polymarket.com

## 2. Order Structure (EIP-712)
Polymarket uses the CTFExchange contract on Polygon for order matching.
Orders are EIP-712 typed structured data signed off-chain.

## 3. EIP-712 Signing Flow
1. Construct order with: tokenId, price, size, side, feeRateBps, nonce, expiration, maker, signer
2. Sign typed data with maker's private key
3. POST signed order to CLOB

## 4. create order vs post order
- `createOrder()` — constructs an unsigned order builder
- `buildOrder()` — builds the signed order
- `postOrder()` — submits to CLOB

## 5. Batch Order Support
Each order is independent. No native batch.

## 6. TokenId / Market Identification
- `tokenId` — CLOB token ID (e.g., "32338...")
- `conditionId` — bytes32 market identifier (e.g., "0xa467...")

## 7. Signer Requirements
- EOA with MATIC for gas on Polygon
- Private key to sign EIP-712 typed data

## 8. Chain ID
- Polygon mainnet: 137

## 9. Signature Types
- EIP-712 typed structured data
- EOA signature (EOA type)
- Or Gnosis Safe / Proxy wallet signatures

## 10. Can we construct and sign orders without POST?
**YES.** The SDK separates order construction/signing from posting.
We can use `buildOrder()` to create a signed order without calling `postOrder()`.

## Decision for this Integration Proof
- **Use captured market snapshot** from real Polymarket Gamma API for deterministic replay
- **Agent generates MarketLens AgentProposal[]** (not raw CLOB orders)
- **Signing Gateway uses EIP-712 compatible signing** for Polymarket order structure
- **Integration proof uses `verifyBatch()` with mock simulation injection**
- **NO SDK dependency** — EIP-712 signing implemented directly to keep scope minimal
- **Classification:** "Polymarket-compatible EIP-712 signing prototype" (SDK was checked but not integrated to avoid complexity)

## Market Selected
- **Question:** "Xi Jinping out before 2027?"
- **Market ID:** 559651
- **YES price:** 0.0445 (4.45¢)
- **NO price:** 0.9555 (95.55¢)
- **Volume:** $11.9M
- **Source:** https://gamma-api.polymarket.com/markets/559651
