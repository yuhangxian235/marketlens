# PredictionMarket contract specification

This specification is implemented by `contracts/src/PredictionMarket.sol` and covered by
unit, fuzz, and stateful invariant tests.

## 1. State model

```solidity
enum Outcome {
    Unset,
    Yes,
    No
}

struct Market {
    string question;
    bytes32 questionHash;
    uint64 closesAt;
    uint64 resolvedAt;
    Outcome result;
    bool resolved;
    uint256 yesPool;
    uint256 noPool;
    uint256 remainingWinningStake;
    uint256 remainingPayout;
    bool refundMode;
}
```

Other state:

```solidity
address public immutable owner;
uint256 public nextMarketId;
mapping(uint256 => Market) public markets;
mapping(uint256 => mapping(address => mapping(Outcome => uint256))) public positions;
mapping(uint256 => mapping(address => bool)) public claimed;
```

Position units equal contributed wei in the MVP. They are internal accounting units, not ERC-20 tokens.

## 2. External interface

```solidity
function createMarket(
    string calldata question,
    uint64 closesAt
) external onlyOwner returns (uint256 marketId);

function buyPosition(
    uint256 marketId,
    Outcome outcome
) external payable;

function resolveMarket(
    uint256 marketId,
    Outcome result
) external onlyOwner;

function claimReward(
    uint256 marketId
) external nonReentrant returns (uint256 payout);
```

Lifecycle:

```text
created → open for buys → closed → manually resolved → winning wallets claim
```

## 3. Events

```solidity
event MarketCreated(
    uint256 indexed marketId,
    address indexed creator,
    bytes32 indexed questionHash,
    string question,
    uint64 closesAt
);

event PositionBought(
    uint256 indexed marketId,
    address indexed wallet,
    Outcome indexed outcome,
    bytes32 questionHash,
    uint256 amount,
    uint256 positionUnits,
    uint256 yesPoolAfter,
    uint256 noPoolAfter
);

event MarketResolved(
    uint256 indexed marketId,
    address indexed resolver,
    Outcome indexed result,
    bytes32 questionHash,
    uint256 winningPool,
    uint256 totalPool,
    bool refundMode,
    uint64 resolvedAt
);

event RewardClaimed(
    uint256 indexed marketId,
    address indexed wallet,
    Outcome indexed outcome,
    uint256 winningStake,
    uint256 payout,
    bool refundMode
);
```

### RPC-enriched fields

The indexer adds these from the log/transaction/block envelope:

- `chain_id`;
- `contract_address`;
- `transaction_hash`;
- `block_number`;
- `block_hash`;
- `log_index`;
- `block_timestamp`.

They are not emitted as event arguments because Ethereum already provides them. A simulated unsigned transaction has no real transaction hash or mined block.

## 4. Preconditions and errors

Custom errors:

```solidity
error Unauthorized();
error InvalidQuestion();
error InvalidCloseTime();
error MarketNotFound(uint256 marketId);
error MarketClosed(uint256 marketId);
error MarketStillOpen(uint256 marketId);
error MarketAlreadyResolved(uint256 marketId);
error InvalidOutcome();
error ZeroAmount();
error ValueNotUnitAligned();
error NothingToClaim(uint256 marketId, address wallet);
error AlreadyClaimed(uint256 marketId, address wallet);
error PayoutTransferFailed(address wallet, uint256 payout);
error ReentrantCall();
```

Rules:

- question length is 1–280 UTF-8 bytes;
- `closesAt > block.timestamp`;
- only YES or NO may be purchased/resolved;
- `msg.value > 0`;
- `msg.value % 1 gwei == 0`, enabling exact SQLite `INTEGER` aggregation for contributions and pool totals in the MVP;
- purchases stop at `closesAt` and after resolution;
- resolution occurs no earlier than `closesAt`;
- a wallet can claim once and only with winning stake.

If the resolved side has no stake, the market enters `refundMode`; each participating wallet may reclaim its total YES + NO contribution. This avoids permanently locked pools without adding a separate cancellation action.

## 5. Payout algorithm

At ordinary resolution:

```text
remainingWinningStake = winning pool
remainingPayout = yesPool + noPool
```

At claim:

```text
stake = wallet stake on winning outcome

if stake == remainingWinningStake:
    payout = remainingPayout
else:
    payout = floor(stake × remainingPayout / remainingWinningStake)

remainingWinningStake -= stake
remainingPayout -= payout
```

This distributes the entire market pool. Claim order affects the allocation of whole-wei truncation dust; the final claimant receives the remainder.

An ordinary payout is not guaranteed to remain 1 gwei-aligned after proportional integer division. Analytics therefore treats `payoutWei` as canonical decimal-string wei and never rounds it into an integer-gwei source of truth.

In `refundMode`, `payout = wallet YES stake + wallet NO stake`. The same `claimReward` function and one-claim rule apply.

State is updated and `claimed=true` before the external value transfer. Reentrancy protection is mandatory.

## 6. Invariants

- `yesPool + noPool` equals all accepted buys for a market;
- the sum of wallet YES positions equals `yesPool`;
- the sum of wallet NO positions equals `noPool`;
- a resolved result never changes;
- cumulative claims never exceed the total pool;
- after all winning positions claim, `remainingWinningStake == 0` and `remainingPayout == 0`;
- after all refund-eligible wallets claim, the refundable pool is zero;
- each successful state-changing function emits exactly one domain event;
- direct native transfers to the contract are rejected outside `buyPosition`.

## 7. Required tests

Unit and fuzz tests:

- owner and non-owner market creation;
- empty/oversized question and invalid close time;
- YES/NO buys and pool totals;
- zero-value, invalid outcome, late and post-resolution buys;
- non-gwei-aligned value;
- early, duplicate and invalid resolution;
- proportional payout across several wallets;
- zero-winner full refund;
- last-claim rounding dust;
- losing wallet, zero stake and double claim;
- failed recipient transfer and reentrancy attempt;
- event topics/data and `questionHash`;
- conservation: claims plus remaining payout equals resolved total pool.

## 8. Admin and oracle limitation

`owner` is a centralized demo resolver. MarketLens must describe the resolution as manual and trusted; it cannot imply decentralized or oracle-backed truth.
