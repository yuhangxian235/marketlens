# Why Moss?

## Without Moss (typical approach)
```
User Intent → Manual calldata → Send transaction
```
Problems:
- Parameters can be wrong (wrong market, wrong outcome, wrong amount)
- User intent is lost after encoding
- No structured verification before signing
- Error = reverted transaction + lost gas

## With Moss + MarketLens
```
User Intent → Moss Capability → Trace Simulation → Receipt → Intent Verification
```
Advantages:
1. **Deterministic action construction** — same intent always produces same calldata
2. **Protocol-level typing** — marketId is uint256, outcome is YES|NO (not raw bytes)
3. **Structured Receipt** — PositionBought, nativeTransfer, RewardClaimed as typed objects
4. **Ordered Change tracking** — every event and transfer accounted for, in order
5. **Transparent intent checking** — buyer_matches, market_id_matches, payment_within_limit as individual rules

## Moss is not
- A replacement for smart contracts
- A blockchain or L2
- A wallet

## Moss is
- A verifiable action layer between user intent and onchain execution
- A deterministic simulation framework
- A structured receipt system

