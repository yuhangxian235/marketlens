# URYZEN MONAD-NATIVE INTEGRATION — READ-ONLY RECON REPORT

**Date:** 2026-08-08
**Duration:** ~35 minutes (within 45-min limit)
**Method:** Read-only: public HTML/JS bundle inspection, RPC eth_getCode, public API

---

## 1. Uryzen Current Status

**ACTIVE.** `uryzen.com` is live, serving a Next.js production app. 581 events in API.
The app supports sports betting and prediction markets on Monad Testnet.

Evidence:
- HTML meta: "No fixed odds. Bet on sports & events on Monad testnet."
- wagmi config: `appName: "Uryzen"`, RPC: `https://testnet-rpc.monad.xyz`

## 2. Monad Testnet Confirmed?

**YES.** Chain ID `10143` confirmed in JS bundle:
```js
defineChain({id:10143,name:"Monad Testnet",nativeCurrency:{name:"MON",symbol:"MON",decimals:18},rpcUrls:{default:{http:["https://testnet-rpc.monad.xyz"]}}})
```

## 3. Chain ID

**10143** (Monad Testnet)

## 4. Real Active Market Example

- **Event ID (API):** 260
- **On-chain Event ID:** 273
- **Title:** "Who will win the 2027 French presidential election?"
- **Outcomes:** 9 options (Edouard Philippe, Jordan Bardella, Marine Le Pen, etc.)
- **Total Pool:** 40.50 MON
- **Status:** Open (status=0)
- **Category:** Politics/Elections
- **Source:** `https://uryzen.com/api/events/`

## 5. Contract Address

**BettingCore (primary):** `0xdFBd38b6D5A233009b59Bb3b2831BC89663016C1`
**EventStorage:** `0x85786718E7dd37720447eD4b318BC01a06911e42`

## 6. Address Confidence

**HIGH.** Both addresses verified via:
1. ✅ Found in production JS bundle (`1d943aff050210ef.js`) — `writeContract({address:"0xdFBd...", abi:BettingCoreABI, functionName:"placeBet",...})`
2. ✅ `eth_getCode` returns non-zero bytecode on Monad Testnet RPC
3. ✅ Both contracts are UUPS proxies (consistent with `proxiableUUID` in ABI)
4. ✅ EventStorage address found in production bundle used for `readContract({functionName:"getEvent"})`

## 7. Evidence Source

- Primary: `https://uryzen.com/_next/static/chunks/e297a22742067db4.js` — contains full ABI
- Secondary: `https://uryzen.com/_next/static/chunks/1d943aff050210ef.js` — contains `writeContract` calls with contract address
- Tertiary: `https://uryzen.com/_next/static/chunks/9c22833be7a78259.js` — contains wagmi config (chainId 10143, RPC URL)
- Quaternary: `ethereum.getCode()` via `https://testnet-rpc.monad.xyz`

## 8. Real Uryzen Tx Hash

**NOT FOUND within time limit.** RPC blockchain scanning (`eth_getLogs`, `eth_getBlockByNumber`) timed out due to block height (51M+). This is a minor gap — the contract existence is verified via `eth_getCode`, and the transaction structure is confirmed via JS bundle analysis.

## 9. Tx Target

`0xdFBd38b6D5A233009b59Bb3b2831BC89663016C1` (BettingCore proxy)

## 10. Tx Value

**msg.value in MON** — `placeBet` and `placeBetsBatch` are both `payable`.
Frontend: `value: parseEther(amount)`. MON is the native currency.

## 11. Function Selectors

| Function | Signature | Selector |
|----------|-----------|----------|
| placeBet | placeBet(uint256,uint8,uint256) | **0xda866c48** |
| placeBetsBatch | placeBetsBatch(uint256[],uint8[],uint256[]) | **0x4487dda7** |

**Correction (2026-08-08):** The initial RECON pass computed selectors via Node.js `crypto.createHash('sha3-256')`, which produces SHA3-256, NOT Keccak-256. Ethereum uses the original Keccak-256 (pre-SHA3 standardization). The correct selectors above were recomputed via `ethers.id()` (true Keccak-256). The integration code uses `ethers.id()` at runtime and therefore produces correct selectors automatically.

## 12. Function Names

- `placeBet` — single bet
- `placeBetsBatch` — multi-bet cart → ONE transaction
- Both are `payable` (carry msg.value in MON)

## 13. ABI Available?

**YES.** Full ABI extracted from JS bundle `e297a22742067db4.js`.
Key functions confirmed:
- `placeBet(uint256 eventId, uint8 predictionIndex, uint256 betAmount)` payable
- `placeBetsBatch(uint256[] eventIds, uint8[] predictionIndices, uint256[] betAmounts)` payable
- `getEvent(uint256)` view → returns event data
- `getUserBet(uint256,address)` view → returns user bet
- `claimAllRewards(uint256[])` nonpayable (not payable — rewards are internal)
- Events: `BetPlaced`, `BatchBetPlaced`, `RewardsClaimed`

## 14. Calldata Understood?

**YES.** Simple ABI-encoded parameters:
- Single bet: `0xda866c48` + encode(eventId, predictionIndex, betAmount)
- Multi-bet: `0x4487dda7` + encode([eventIds], [indices], [amounts])
- All types are standard Solidity: uint256, uint8, arrays
- No complex struct encoding needed

## 15. Multi-Bet Verified?

**YES — CONFIRMED.**

Evidence:
1. ✅ `placeBetsBatch(uint256[],uint8[],uint256[])` exists in ABI with `payable` modifier
2. ✅ Event `BatchBetPlaced(uint256[],address,uint256)` exists in ABI
3. ✅ Error `IncorrectTotalBetAmount` and `InvalidBatchSize` confirm batch validation
4. ✅ Frontend cart system: `https://uryzen.com/api/cart/?wallet=...`
5. ✅ Cart API returns items with `on_chain_event_id` → feeds into `placeBetsBatch`

**Multi-bet is NOT just UI. It is a real single on-chain transaction with array parameters.**

## 16. Multi-Bet Function

```
function placeBetsBatch(
    uint256[] calldata eventIds,
    uint8[] calldata predictionIndices,
    uint256[] calldata betAmounts
) external payable
```

## 17. Multi-Bet Argument Structure

| Param | Type | Description |
|-------|------|-------------|
| eventIds | uint256[] | On-chain event IDs |
| predictionIndices | uint8[] | Selected outcome indices |
| betAmounts | uint256[] | Bet amounts in wei (18 decimals) |
| msg.value | uint256 | Total MON sent (must match sum of betAmounts) |

## 18. Private Backend Dependency?

**LOW.** The Uryzen API (`https://uryzen.com/api/`) provides:
- Event listing/metadata (public, no auth needed)
- Cart management (wallet-address-keyed, but read-only for cart inspection)

Transaction construction uses **standard wagmi `writeContract`**:
```js
writeContract({
  address: "0xdFBd38b6D5A233009b59Bb3b2831BC89663016C1",
  abi: BettingCoreABI,
  functionName: "placeBet",
  args: [BigInt(eventId), BigInt(predictionIndex), parseEther(amount)],
  value: parseEther(amount)
})
```

**No private backend signatures are required for transaction construction.**
The wallet signs the transaction directly via the connected wallet (wagmi).

## 19. Unsigned Tx Can Be Constructed?

**YES.** All components are known:
- Contract address (verified)
- ABI (extracted)
- Function selectors (computed)
- Parameter encoding (standard Solidity ABI)
- msg.value calculation (simple sum)

## 20. Signing Can Be Separated from Tx Construction?

**YES.** The wagmi pattern is:
1. Build tx object (off-chain)
2. User wallet signs (on-demand)
3. Broadcast signed tx

MarketLens can intercept between step 1 and step 2.

## 21. MarketLens Can Sit Before Signer?

**YES — GO CANDIDATE.**

Architecture:
```
Independent Agent reads Uryzen API events
    ↓
Agent generates bet intents (eventId, predictionIndex, amount)
    ↓
Built unsigned Uryzen-compatible tx (or kept as intent)
    ↓
MarketLens verifyBatch() evaluates against policy
    ↓
PARTIALLY_ELIGIBLE / ELIGIBLE
    ↓
Signing Gateway: only eligible bets → forwarded to wallet
    ↓
Blocked bets: never reach wallet signing
```

## 22. Blocked Action Can Remain Unsigned?

**YES.** Since transaction construction is local (ABI encoding) and signing is deferred to the wallet, MarketLens can simply exclude blocked bets from the `placeBetsBatch` args arrays.

## 23. Real Funds Required?

**NO.** For integration proof:
- Unsigned tx can be constructed locally (ABI encode only)
- Mock wallet can produce signature without broadcasting
- `eth_call` can simulate on Monad Testnet
- Zero MON needed for proof

## 24. Public Tx Required for Proof?

**NO.** `eth_call` can simulate. Or: proof uses `eth_call` to validate the transaction would succeed. No broadcast needed.

## 25. Minimal Adapter Complexity

**LOW.** Mapping is straightforward:

| Agent Intent | Uryzen placeBet param |
|-------------|----------------------|
| marketId → | eventId (uint256) |
| outcome → | predictionIndex (uint8) |
| amount → | betAmount (uint256 wei) |

For MarketLens AgentProposal:
```ts
{
  proposal_id: `uryzen-${eventId}-${index}`,
  agent_id: "uryzen-prediction-agent-v1",
  market_id: String(eventId),
  capability: "bet_position",  // new capability
  outcome: "OPTION_0",         // maps predictionIndex
  requested_amount: String(amountWei),
  ...
}
```

## 26. Estimated Engineering Time

**2–3 HOURS** for full integration proof:
- 30min: Agent reads Uryzen API + generates intents
- 30min: Adapter maps intents → AgentProposal
- 30min: Unsigned tx builder (ABI encode)
- 30min: Signing gateway with eth_call simulation
- 30min: CLI demo script
- 30min: Tests (similar to Polymarket proof)
- 15min: Security scan + report

---

## 27-29. COMPARATIVE SCORING

| Criterion | Uryzen | RareBetSports | Polymarket |
|-----------|--------|---------------|------------|
| **Monad-native fit /10** | **10** | 1 (unknown) | 0 (Polygon) |
| **Public integration openness /10** | **9** | 1 (no data) | 7 (SDK available) |
| **Batch-policy fit /10** | **10** | ? | 5 (complex CLOB) |
| **Signing-gate feasibility /10** | **10** | ? | 4 (SDK dep needed) |
| **Implementation risk /10** | **2** (low) | 10 (no info) | 6 (moderate) |
| **Estimated hours to proof** | **2–3h** | ∞ | 4–6h |
| **Hackathon narrative value /10** | **10** | 2 | 7 |
| **TOTAL /70** | **61** | ~15 | 29 |

### Scoring Rationale

**Uryzen (61/70):**
- ✅ Real Monad-native: runs on 10143, uses MON for bets
- ✅ Fully public: ABI + contract + API all accessible without auth
- ✅ Native batch: `placeBetsBatch` is exactly what batch-policy needs
- ✅ Signing boundary: standard wagmi writeContract, perfectly interceptable
- ✅ Low risk: all key pieces confirmed, minimal unknowns
- ✅ Narrative: "MarketLens protects an Agent on a real Monad-native prediction market"

**RareBetSports (~15/70):**
- ❌ No accessible product (landing page only, 114 bytes HTML)
- ❌ No contract data discoverable
- ❌ No technical evidence at all

**Polymarket (29/70):**
- ❌ NOT Monad-native (Polygon chain)
- ⚠️ CLOB integration adds significant complexity
- ⚠️ SDK dependency needed or compatible EIP-712 needed
- ✅ Already partially researched

---

## 30. RECOMMENDED TARGET

# ✅ GO — Uryzen Integration

Uryzen is the single strongest candidate for MarketLens' Monad-native prediction agent integration proof. It offers:

1. **Real Monad Testnet** deployment (chainId 10143)
2. **Clean payable contract** with `placeBetsBatch` (native multi-bet)
3. **Public API** for market discovery
4. **Simple ABI** with standard Solidity types
5. **Insertable signing boundary** via standard wagmi pattern
6. **Zero real funds** needed for proof (eth_call + mock wallet)

### Comparison to Polymarket Proof (already completed)
The Polymarket proof was "Polymarket-compatible EIP-712 signing prototype" (NOT real Polymarket integration). The Uryzen proof would be a **REAL** integration:
- Real Monad contract calls (unsigned, simulated)
- Real Monad-native batch function
- True "Monad agent protection" narrative

---

## 2–3 HOUR MAXIMUM IMPLEMENTATION PLAN

### Phase 1: Agent + Adapter (45 min)
```
examples/uryzen-agent/
  src/agent.ts        — reads Uryzen API, generates bet intents
  src/adapter.ts      — maps BetIntent → AgentProposal
  src/types.ts        — BetIntent, UryzenMarket types
  snapshots/          — captured market snapshot
```

### Phase 2: Transaction Builder (30 min)
```
  src/tx-builder.ts   — ABI-encode placeBet/placeBetsBatch unsigned tx
  src/mock-wallet.ts  — ephemeral dev key, sign tx (never broadcast)
```

### Phase 3: Signing Gateway (30 min)
```
  src/signing-gateway.ts — consume MarketLens decision + unsigned tx → sign or refuse
```

### Phase 4: CLI Demo + Tests (45 min)
```
  src/run-demo.ts     — full flow: Agent → MarketLens → Gateway
  tests/              — 9 tests (same pattern as Polymarket proof)
```

### Phase 5: Security + Report (15 min)
- Security scan (no keys committed)
- Final report
- PR

### Key invariants
- NO eth_sendRawTransaction
- NO real MON
- NO real wallet
- eth_call ONLY for simulation
- Ephemeral dev keys only
- All contracts verified on Monad Testnet

---

**WAITING FOR NEXT INSTRUCTION. DO NOT START IMPLEMENTATION.**
