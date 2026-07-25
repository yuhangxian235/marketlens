// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract PredictionMarket {
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

    address public immutable owner;
    uint256 public nextMarketId = 1;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => mapping(Outcome => uint256))) public positions;
    mapping(uint256 => mapping(address => bool)) public claimed;
    uint256 private entered;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (entered == 1) revert ReentrantCall();
        entered = 1;
        _;
        entered = 0;
    }

    function createMarket(string calldata question, uint64 closesAt)
        external
        onlyOwner
        returns (uint256 marketId)
    {
        uint256 questionLength = bytes(question).length;
        if (questionLength == 0 || questionLength > 280) revert InvalidQuestion();
        if (closesAt <= block.timestamp) revert InvalidCloseTime();

        marketId = nextMarketId++;
        bytes32 questionHash = keccak256(bytes(question));
        Market storage created = markets[marketId];
        created.question = question;
        created.questionHash = questionHash;
        created.closesAt = closesAt;

        emit MarketCreated(marketId, msg.sender, questionHash, question, closesAt);
    }

    function buyPosition(uint256 marketId, Outcome outcome) external payable {
        Market storage selected = markets[marketId];
        if (marketId == 0 || marketId >= nextMarketId) revert MarketNotFound(marketId);
        if (selected.resolved || block.timestamp >= selected.closesAt) {
            revert MarketClosed(marketId);
        }
        if (outcome != Outcome.Yes && outcome != Outcome.No) revert InvalidOutcome();
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value % 1 gwei != 0) revert ValueNotUnitAligned();

        positions[marketId][msg.sender][outcome] += msg.value;
        if (outcome == Outcome.Yes) {
            selected.yesPool += msg.value;
        } else {
            selected.noPool += msg.value;
        }

        emit PositionBought(
            marketId,
            msg.sender,
            outcome,
            selected.questionHash,
            msg.value,
            msg.value,
            selected.yesPool,
            selected.noPool
        );
    }

    function resolveMarket(uint256 marketId, Outcome result) external onlyOwner {
        Market storage selected = markets[marketId];
        if (marketId == 0 || marketId >= nextMarketId) revert MarketNotFound(marketId);
        if (selected.resolved) revert MarketAlreadyResolved(marketId);
        if (block.timestamp < selected.closesAt) revert MarketStillOpen(marketId);
        if (result != Outcome.Yes && result != Outcome.No) revert InvalidOutcome();

        uint256 totalPool = selected.yesPool + selected.noPool;
        uint256 winningPool = result == Outcome.Yes ? selected.yesPool : selected.noPool;
        bool refundMode = winningPool == 0;

        selected.result = result;
        selected.resolved = true;
        selected.resolvedAt = uint64(block.timestamp);
        selected.refundMode = refundMode;
        selected.remainingWinningStake = refundMode ? totalPool : winningPool;
        selected.remainingPayout = totalPool;

        emit MarketResolved(
            marketId,
            msg.sender,
            result,
            selected.questionHash,
            winningPool,
            totalPool,
            refundMode,
            uint64(block.timestamp)
        );
    }

    function claimReward(uint256 marketId) external nonReentrant returns (uint256 payout) {
        Market storage selected = markets[marketId];
        if (marketId == 0 || marketId >= nextMarketId) revert MarketNotFound(marketId);
        if (!selected.resolved) revert MarketStillOpen(marketId);
        if (claimed[marketId][msg.sender]) revert AlreadyClaimed(marketId, msg.sender);

        uint256 stake;
        Outcome claimedOutcome;
        if (selected.refundMode) {
            stake = positions[marketId][msg.sender][Outcome.Yes]
                + positions[marketId][msg.sender][Outcome.No];
            claimedOutcome = selected.result;
            payout = stake;
        } else {
            claimedOutcome = selected.result;
            stake = positions[marketId][msg.sender][claimedOutcome];
            if (stake == selected.remainingWinningStake) {
                payout = selected.remainingPayout;
            } else if (stake != 0) {
                payout = (stake * selected.remainingPayout) / selected.remainingWinningStake;
            }
        }
        if (stake == 0) revert NothingToClaim(marketId, msg.sender);

        claimed[marketId][msg.sender] = true;
        selected.remainingWinningStake -= stake;
        selected.remainingPayout -= payout;

        (bool sent,) = payable(msg.sender).call{ value: payout }("");
        if (!sent) revert PayoutTransferFailed(msg.sender, payout);

        emit RewardClaimed(marketId, msg.sender, claimedOutcome, stake, payout, selected.refundMode);
    }
}
