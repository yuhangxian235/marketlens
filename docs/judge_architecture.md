# Judge Architecture (Simplified)

```
User
  ↓
MarketLens Analytics  ←  Contract Events  ←  Local Anvil
  ↓
Product Insight  (data → observation)
  ↓
User Intent  (buyer, market, outcome, amount)
  ↓
Moss Capability  (deterministic action construction)
  ↓
Trace Simulation  (debug_traceCall on local Anvil)
  ↓
Structured Receipt  (ordered Changes: events + transfers)
  ↓
Intent Verification  (7 transparent rules)
  ↓
Result: PASS (unsigned) or BLOCKED (do not sign)
```

## Colors
- 🟢 Green = REAL / VERIFIED
- 🟡 Yellow = DISABLED / NOT IMPLEMENTED

## What's real
- Contract on local Anvil
- Event indexing to SQLite
- Analytics (SQL + pandas)
- Moss Protocol integration
- trace simulation
- Receipt parsing
- Intent checking

## What's not
- Monad mainnet/testnet connection
- Wallet signing
- Transaction broadcasting
- MCP composition

