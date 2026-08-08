# Uryzen Integration Evidence

**Date:** 2026-08-08
**Source:** Uryzen production JS bundle + Monad Testnet RPC

## Contract Addresses

| Contract | Address | Source |
|----------|---------|--------|
| BettingCore (proxy) | `0xdFBd38b6D5A233009b59Bb3b2831BC89663016C1` | JS bundle `1d943aff050210ef.js` — `writeContract({address:"0xdFBd..."})` |
| EventStorage (proxy) | `0x85786718E7dd37720447eD4b318BC01a06911e42` | JS bundle `9c22833be7a78259.js` — `readContract({address:"0x857..."})` |

Verified via `eth_getCode` on Monad Testnet RPC — both return non-zero bytecode.

## Chain ID

**10143** (Monad Testnet)

Source: JS bundle `9c22833be7a78259.js`:
```js
defineChain({id:10143,name:"Monad Testnet",nativeCurrency:{name:"MON",symbol:"MON",decimals:18},rpcUrls:{default:{http:["https://testnet-rpc.monad.xyz"]}}})
```

## ABI Function Signatures

### placeBet
```
placeBet(uint256 eventId, uint8 predictionIndex, uint256 betAmount) payable
Selector: 0xda866c48
```
Computed via `ethers.id("placeBet(uint256,uint8,uint256)").slice(0,10)` = true Keccak-256.

### placeBetsBatch
```
placeBetsBatch(uint256[] eventIds, uint8[] predictionIndices, uint256[] betAmounts) payable
Selector: 0x4487dda7
```
Computed via `ethers.id("placeBetsBatch(uint256[],uint8[],uint256[])").slice(0,10)` = true Keccak-256.

**Correction:** The initial RECON report (docs/uryzen-monad-recon-report.md) reported `0x687228ed` and `0x67c77639` computed via Node.js `crypto.createHash('sha3-256')`. This produces SHA3-256, NOT Keccak-256 — Ethereum uses the original Keccak-256 (pre-SHA3 standardization). The integration code (`types.ts`) uses `ethers.id()` at runtime, which always produces correct Keccak-256 selectors.

### getEvent
```
getEvent(uint256 eventId) view
Returns: (uint8 eventType, uint256 eventTime, string participantA, string participantB, uint256 totalPool, uint256 winnerPool, uint256 loserPool, uint8 status, uint8 result, uint8 riskLevel, uint256 claimDeadline, bool expiredProcessed)
```

Source: JS bundle `e297a22742067db4.js` — full ABI extracted.

## Multi-Bet Evidence

- Function: `placeBetsBatch(uint256[],uint8[],uint256[])` payable
- Event: `BatchBetPlaced(uint256[],address,uint256)`
- Error: `IncorrectTotalBetAmount`, `InvalidBatchSize`
- Cart API: `https://uryzen.com/api/cart/?wallet=...`

Source: JS bundle `e297a22742067db4.js`

## Market Snapshot

- API ID: 260
- On-chain Event ID: 273
- Title: "Who will win the 2027 French presidential election?"
- Outcomes: 9 options (Edouard Philippe, Jordan Bardella, Marine Le Pen, etc.)
- Total Pool: 40.50 MON
- Status: Open

Source: `https://uryzen.com/api/events/`

## Transaction Reference

Real Uryzen transaction search attempted via RPC `eth_getLogs` but timed out
due to block height (51M+). Contract existence verified via `eth_getCode`.
Transaction structure confirmed via JS bundle analysis (wagmi `writeContract`).

## Monad Testnet

- Chain ID: 10143
- RPC: https://testnet-rpc.monad.xyz
- Native currency: MON (18 decimals)

captured_at: 2026-08-08
