// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { PredictionMarket } from "../src/PredictionMarket.sol";

contract RejectingWallet {
    function buy(PredictionMarket market, uint256 marketId, PredictionMarket.Outcome outcome)
        external
        payable
    {
        market.buyPosition{ value: msg.value }(marketId, outcome);
    }

    function claim(PredictionMarket market, uint256 marketId) external {
        market.claimReward(marketId);
    }

    receive() external payable {
        revert("reject payout");
    }
}

contract PredictionMarketTest is Test {
    PredictionMarket internal market;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        vm.prank(owner);
        market = new PredictionMarket();
    }

    function testOwnerCanCreateMarket() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);

        vm.prank(owner);
        uint256 marketId = market.createMarket("Will Monad ship?", closesAt);

        assertEq(marketId, 1);
        (
            string memory question,
            bytes32 questionHash,
            uint64 actualClosesAt,,
            PredictionMarket.Outcome result,
            bool resolved,
            uint256 yesPool,
            uint256 noPool,,,
            bool refundMode
        ) = market.markets(marketId);
        assertEq(question, "Will Monad ship?");
        assertEq(questionHash, keccak256(bytes("Will Monad ship?")));
        assertEq(actualClosesAt, closesAt);
        assertEq(uint8(result), uint8(PredictionMarket.Outcome.Unset));
        assertFalse(resolved);
        assertEq(yesPool, 0);
        assertEq(noPool, 0);
        assertFalse(refundMode);
    }

    function testWalletCanBuyYesAndNoPositions() public {
        vm.prank(owner);
        uint256 marketId = market.createMarket("Will Monad ship?", uint64(block.timestamp + 1 days));
        vm.deal(alice, 5 ether);

        vm.prank(alice);
        market.buyPosition{ value: 2 ether }(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(alice);
        market.buyPosition{ value: 3 ether }(marketId, PredictionMarket.Outcome.No);

        assertEq(market.positions(marketId, alice, PredictionMarket.Outcome.Yes), 2 ether);
        assertEq(market.positions(marketId, alice, PredictionMarket.Outcome.No), 3 ether);
        (,,,,,, uint256 yesPool, uint256 noPool,,,) = market.markets(marketId);
        assertEq(yesPool, 2 ether);
        assertEq(noPool, 3 ether);
    }

    function testOwnerCanResolveClosedMarket() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("Will Monad ship?", closesAt);
        vm.deal(alice, 2 ether);
        vm.prank(alice);
        market.buyPosition{ value: 2 ether }(marketId, PredictionMarket.Outcome.Yes);
        vm.deal(bob, 3 ether);
        vm.prank(bob);
        market.buyPosition{ value: 3 ether }(marketId, PredictionMarket.Outcome.No);

        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        (
            ,,,
            uint64 resolvedAt,
            PredictionMarket.Outcome result,
            bool resolved,,,
            uint256 remainingWinningStake,
            uint256 remainingPayout,
            bool refundMode
        ) = market.markets(marketId);
        assertEq(resolvedAt, closesAt);
        assertEq(uint8(result), uint8(PredictionMarket.Outcome.Yes));
        assertTrue(resolved);
        assertEq(remainingWinningStake, 2 ether);
        assertEq(remainingPayout, 5 ether);
        assertFalse(refundMode);
    }

    function testClaimsConservePoolAndGiveRoundingDustToLastWinner() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("Will Monad ship?", closesAt);
        address carol = makeAddr("carol");
        vm.deal(alice, 1 gwei);
        vm.deal(bob, 2 gwei);
        vm.deal(carol, 7 gwei);
        vm.prank(alice);
        market.buyPosition{ value: 1 gwei }(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(bob);
        market.buyPosition{ value: 2 gwei }(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(carol);
        market.buyPosition{ value: 7 gwei }(marketId, PredictionMarket.Outcome.No);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.prank(alice);
        uint256 alicePayout = market.claimReward(marketId);
        vm.prank(bob);
        uint256 bobPayout = market.claimReward(marketId);

        assertEq(alicePayout, 3_333_333_333);
        assertEq(bobPayout, 6_666_666_667);
        assertEq(alice.balance, alicePayout);
        assertEq(bob.balance, bobPayout);
        assertEq(alicePayout + bobPayout, 10 gwei);
        (,,,,,,,, uint256 remainingStake, uint256 remainingPayout,) = market.markets(marketId);
        assertEq(remainingStake, 0);
        assertEq(remainingPayout, 0);
    }

    function testZeroWinnerMarketRefundsEveryContribution() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("Will Monad ship?", closesAt);
        vm.deal(alice, 3 ether);
        vm.prank(alice);
        market.buyPosition{ value: 3 ether }(marketId, PredictionMarket.Outcome.No);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.prank(alice);
        uint256 payout = market.claimReward(marketId);

        assertEq(payout, 3 ether);
        assertEq(alice.balance, 3 ether);
        (,,,,,,,, uint256 remainingStake, uint256 remainingPayout, bool refundMode) =
            market.markets(marketId);
        assertTrue(refundMode);
        assertEq(remainingStake, 0);
        assertEq(remainingPayout, 0);
    }

    function testCreateMarketRejectsInvalidInputsAndUnauthorizedWallet() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.Unauthorized.selector);
        market.createMarket("question", uint64(block.timestamp + 1 days));

        vm.startPrank(owner);
        vm.expectRevert(PredictionMarket.InvalidQuestion.selector);
        market.createMarket("", uint64(block.timestamp + 1 days));
        vm.expectRevert(PredictionMarket.InvalidQuestion.selector);
        market.createMarket(new string(281), uint64(block.timestamp + 1 days));
        vm.expectRevert(PredictionMarket.InvalidCloseTime.selector);
        market.createMarket("question", uint64(block.timestamp));
        vm.stopPrank();
    }

    function testBuyPositionRejectsInvalidLifecycleAndValue() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("question", closesAt);
        vm.deal(alice, 2 ether);

        vm.startPrank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.MarketNotFound.selector, uint256(999))
        );
        market.buyPosition{ value: 1 gwei }(999, PredictionMarket.Outcome.Yes);
        vm.expectRevert(PredictionMarket.InvalidOutcome.selector);
        market.buyPosition{ value: 1 gwei }(marketId, PredictionMarket.Outcome.Unset);
        vm.expectRevert(PredictionMarket.ZeroAmount.selector);
        market.buyPosition(marketId, PredictionMarket.Outcome.Yes);
        vm.expectRevert(PredictionMarket.ValueNotUnitAligned.selector);
        market.buyPosition{ value: 1 gwei + 1 }(marketId, PredictionMarket.Outcome.Yes);
        vm.stopPrank();

        vm.warp(closesAt);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketClosed.selector, marketId));
        market.buyPosition{ value: 1 gwei }(marketId, PredictionMarket.Outcome.Yes);
    }

    function testResolveMarketRejectsUnauthorizedEarlyAndDuplicateResolution() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("question", closesAt);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.Unauthorized.selector);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(PredictionMarket.MarketStillOpen.selector, marketId));
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.MarketAlreadyResolved.selector, marketId)
        );
        market.resolveMarket(marketId, PredictionMarket.Outcome.No);
    }

    function testLosingAndDuplicateClaimsRevert() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("question", closesAt);
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.prank(alice);
        market.buyPosition{ value: 1 ether }(marketId, PredictionMarket.Outcome.Yes);
        vm.prank(bob);
        market.buyPosition{ value: 1 ether }(marketId, PredictionMarket.Outcome.No);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.NothingToClaim.selector, marketId, bob)
        );
        market.claimReward(marketId);
        vm.prank(alice);
        market.claimReward(marketId);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PredictionMarket.AlreadyClaimed.selector, marketId, alice)
        );
        market.claimReward(marketId);
    }

    function testPayoutFailureRollsBackClaimState() public {
        uint64 closesAt = uint64(block.timestamp + 1 days);
        vm.prank(owner);
        uint256 marketId = market.createMarket("question", closesAt);
        RejectingWallet rejecting = new RejectingWallet();
        vm.deal(address(rejecting), 1 ether);
        rejecting.buy{ value: 1 ether }(market, marketId, PredictionMarket.Outcome.Yes);
        vm.warp(closesAt);
        vm.prank(owner);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        vm.expectRevert(
            abi.encodeWithSelector(
                PredictionMarket.PayoutTransferFailed.selector, address(rejecting), 1 ether
            )
        );
        rejecting.claim(market, marketId);

        assertFalse(market.claimed(marketId, address(rejecting)));
    }

    function testDirectNativeTransferIsRejected() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        (bool sent,) = address(market).call{ value: 1 ether }("");
        assertFalse(sent);
        assertEq(address(market).balance, 0);
    }

    function testFuzzBuyPositionTracksPoolAndUnits(uint96 rawAmount, bool buyYes) public {
        uint256 amount = bound(uint256(rawAmount), 1, 10_000_000) * 1 gwei;
        vm.prank(owner);
        uint256 marketId = market.createMarket("question", uint64(block.timestamp + 1 days));
        vm.deal(alice, amount);
        PredictionMarket.Outcome outcome =
            buyYes ? PredictionMarket.Outcome.Yes : PredictionMarket.Outcome.No;

        vm.prank(alice);
        market.buyPosition{ value: amount }(marketId, outcome);

        assertEq(market.positions(marketId, alice, outcome), amount);
        (,,,,,, uint256 yesPool, uint256 noPool,,,) = market.markets(marketId);
        assertEq(yesPool, buyYes ? amount : 0);
        assertEq(noPool, buyYes ? 0 : amount);
        assertEq(address(market).balance, amount);
    }
}
