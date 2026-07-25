// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { PredictionMarket } from "../src/PredictionMarket.sol";

contract ClaimStateObserver {
    PredictionMarket private immutable market;
    uint256 private immutable marketId;
    bool public observedClaimed;

    constructor(PredictionMarket market_, uint256 marketId_) {
        market = market_;
        marketId = marketId_;
    }

    function buy() external payable {
        market.buyPosition{ value: msg.value }(marketId, PredictionMarket.Outcome.Yes);
    }

    function claim() external {
        market.claimReward(marketId);
    }

    receive() external payable {
        observedClaimed = market.claimed(marketId, address(this));
    }
}

contract PredictionMarketCoverageTest is Test {
    PredictionMarket internal market;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        vm.prank(owner);
        market = new PredictionMarket();
    }

    function _create(uint64 closesAt) internal returns (uint256 marketId) {
        vm.prank(owner);
        marketId = market.createMarket("Will the condition be met?", closesAt);
    }

    function _buy(
        uint256 marketId,
        address wallet,
        PredictionMarket.Outcome outcome,
        uint256 amount
    ) internal {
        vm.deal(wallet, amount);
        vm.prank(wallet);
        market.buyPosition{ value: amount }(marketId, outcome);
    }

    function testNonOwnerCannotCreateMarket() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.Unauthorized.selector);
        market.createMarket("question", uint64(block.timestamp + 1 days));
    }

    function testEmptyQuestionCannotCreateMarket() public {
        vm.prank(owner);
        vm.expectRevert(PredictionMarket.InvalidQuestion.selector);
        market.createMarket("", uint64(block.timestamp + 1 days));
    }

    function testCloseTimeAtCurrentTimestampCannotCreateMarket() public {
        vm.prank(owner);
        vm.expectRevert(PredictionMarket.InvalidCloseTime.selector);
        market.createMarket("question", uint64(block.timestamp));
    }

    function testWalletCanBuyYes() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 2 ether);

        assertEq(market.positions(marketId, alice, PredictionMarket.Outcome.Yes), 2 ether);
        (,,,,,, uint256 yesPool, uint256 noPool,,,) = market.markets(marketId);
        assertEq(yesPool, 2 ether);
        assertEq(noPool, 0);
    }

    function testWalletCanBuyNo() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));
        _buy(marketId, alice, PredictionMarket.Outcome.No, 3 ether);

        assertEq(market.positions(marketId, alice, PredictionMarket.Outcome.No), 3 ether);
        (,,,,,, uint256 yesPool, uint256 noPool,,,) = market.markets(marketId);
        assertEq(yesPool, 0);
        assertEq(noPool, 3 ether);
    }

    function testRepeatedBuysAccumulateWalletStakeAndPool() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));
        vm.deal(alice, 5 ether);
        vm.startPrank(alice);
        market.buyPosition{ value: 2 ether }(marketId, PredictionMarket.Outcome.Yes);
        market.buyPosition{ value: 3 ether }(marketId, PredictionMarket.Outcome.Yes);
        vm.stopPrank();

        assertEq(market.positions(marketId, alice, PredictionMarket.Outcome.Yes), 5 ether);
        (,,,,,, uint256 yesPool,,,,) = market.markets(marketId);
        assertEq(yesPool, 5 ether);
    }

    function testZeroValueBuyFails() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.ZeroAmount.selector);
        market.buyPosition(marketId, PredictionMarket.Outcome.Yes);
    }

    function testUnsetOutcomeBuyFails() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));
        vm.deal(alice, 1 gwei);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        market.buyPosition{ value: 1 gwei }(marketId, PredictionMarket.Outcome.Unset);
    }

    function testBuyAtCloseTimeFails() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        vm.deal(alice, 1 gwei);
        vm.warp(closesAt);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketClosed.selector, marketId));
        market.buyPosition{ value: 1 gwei }(marketId, PredictionMarket.Outcome.Yes);
    }

    function testBuyAfterResolutionFails() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        vm.deal(alice, 1 gwei);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketClosed.selector, marketId));
        market.buyPosition{ value: 1 gwei }(marketId, PredictionMarket.Outcome.Yes);
    }

    function testNonOwnerCannotResolveMarket() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.Unauthorized.selector);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
    }

    function testMarketCannotResolveBeforeClose() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketStillOpen.selector, marketId));
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
    }

    function testOwnerCanResolveYes() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 1 ether);
        vm.warp(closesAt);

        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        (,,,, PredictionMarket.Outcome result, bool resolved,,,,,) = market.markets(marketId);
        assertEq(uint8(result), uint8(PredictionMarket.Outcome.Yes));
        assertTrue(resolved);
    }

    function testOwnerCanResolveNo() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.No, 1 ether);
        vm.warp(closesAt);

        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.No);

        (,,,, PredictionMarket.Outcome result, bool resolved,,,,,) = market.markets(marketId);
        assertEq(uint8(result), uint8(PredictionMarket.Outcome.No));
        assertTrue(resolved);
    }

    function testResolvedMarketCannotResolveAgain() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        vm.warp(closesAt);
        vm.startPrank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.MarketAlreadyResolved.selector, marketId)
        );
        market.resolveMarket(marketId, PredictionMarket.Outcome.No);
        vm.stopPrank();
    }

    function testWinningWalletCanClaimExactPayout() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 2 ether);
        _buy(marketId, bob, PredictionMarket.Outcome.No, 3 ether);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.prank(alice);
        uint256 payout = market.claimReward(marketId);

        assertEq(payout, 5 ether);
        assertEq(alice.balance, 5 ether);
    }

    function testLosingWalletCannotClaim() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 1 ether);
        _buy(marketId, bob, PredictionMarket.Outcome.No, 1 ether);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.NothingToClaim.selector, marketId, bob)
        );
        market.claimReward(marketId);
    }

    function testWinningWalletCannotClaimTwice() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 1 ether);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(alice);
        market.claimReward(marketId);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.AlreadyClaimed.selector, marketId, alice)
        );
        market.claimReward(marketId);
    }

    function testEmptyWinningPoolResolvesIntoRefundMode() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.No, 1 ether);
        vm.warp(closesAt);

        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        (,,,, PredictionMarket.Outcome result, bool resolved,,,,, bool refundMode) =
            market.markets(marketId);
        assertEq(uint8(result), uint8(PredictionMarket.Outcome.Yes));
        assertTrue(resolved);
        assertTrue(refundMode);
    }

    function testBuyForMissingMarketFails() public {
        vm.deal(alice, 1 gwei);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.MarketNotFound.selector, uint256(99))
        );
        market.buyPosition{ value: 1 gwei }(99, PredictionMarket.Outcome.Yes);
    }

    function testResolveForMissingMarketFails() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.MarketNotFound.selector, uint256(99))
        );
        market.resolveMarket(99, PredictionMarket.Outcome.Yes);
    }

    function testClaimForMissingMarketFails() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.MarketNotFound.selector, uint256(99))
        );
        market.claimReward(99);
    }

    function testMarketCreatedEventContainsIndexerFields() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        bytes32 questionHash = keccak256(bytes("Will the condition be met?"));

        vm.expectEmit(true, true, true, true, address(market));
        emit PredictionMarket.MarketCreated(
            1, owner, questionHash, "Will the condition be met?", closesAt
        );
        _create(closesAt);
    }

    function testPositionBoughtEventContainsIndexerFields() public {
        uint256 marketId = _create(uint64(block.timestamp + 1 days));
        bytes32 questionHash = keccak256(bytes("Will the condition be met?"));
        vm.deal(alice, 2 ether);

        vm.expectEmit(true, true, true, true, address(market));
        emit PredictionMarket.PositionBought(
            marketId,
            alice,
            PredictionMarket.Outcome.Yes,
            questionHash,
            2 ether,
            2 ether,
            2 ether,
            0
        );
        vm.prank(alice);
        market.buyPosition{ value: 2 ether }(marketId, PredictionMarket.Outcome.Yes);
    }

    function testMarketResolvedEventContainsIndexerFields() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        bytes32 questionHash = keccak256(bytes("Will the condition be met?"));
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 2 ether);
        _buy(marketId, bob, PredictionMarket.Outcome.No, 3 ether);
        vm.warp(closesAt);

        vm.expectEmit(true, true, true, true, address(market));
        emit PredictionMarket.MarketResolved(
            marketId,
            owner,
            PredictionMarket.Outcome.Yes,
            questionHash,
            2 ether,
            5 ether,
            false,
            closesAt
        );
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
    }

    function testRewardClaimedEventContainsIndexerFields() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        _buy(marketId, alice, PredictionMarket.Outcome.Yes, 2 ether);
        _buy(marketId, bob, PredictionMarket.Outcome.No, 3 ether);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.expectEmit(true, true, true, true, address(market));
        emit PredictionMarket.RewardClaimed(
            marketId, alice, PredictionMarket.Outcome.Yes, 2 ether, 5 ether, false
        );
        vm.prank(alice);
        market.claimReward(marketId);
    }

    function testClaimedStateIsVisibleBeforePayoutTransfer() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        uint256 marketId = _create(closesAt);
        ClaimStateObserver observer = new ClaimStateObserver(market, marketId);
        vm.deal(address(observer), 1 ether);
        observer.buy{ value: 1 ether }();
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        observer.claim();

        assertTrue(observer.observedClaimed());
        assertTrue(market.claimed(marketId, address(observer)));
    }
}
