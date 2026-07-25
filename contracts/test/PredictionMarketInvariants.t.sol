// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";
import { PredictionMarket } from "../src/PredictionMarket.sol";

contract PredictionMarketHandler is Test {
    PredictionMarket public immutable market;
    uint256 public immutable marketId;
    address[4] public actors;
    uint256 public ghostYesBought;
    uint256 public ghostNoBought;
    mapping(address => uint256) public ghostYesByActor;
    mapping(address => uint256) public ghostNoByActor;

    constructor(PredictionMarket market_, uint256 marketId_) {
        market = market_;
        marketId = marketId_;
        actors = [address(0xA11CE), address(0xB0B), address(0xCA401), address(0xDAD)];
    }

    function buy(uint8 rawActorIndex, uint96 rawAmount, bool buyYes) external {
        uint256 amount = bound(uint256(rawAmount), 1, 1_000_000) * 1 gwei;
        address wallet = actors[bound(uint256(rawActorIndex), 0, actors.length - 1)];
        vm.deal(wallet, amount);
        vm.prank(wallet);
        market.buyPosition{ value: amount }(
            marketId, buyYes ? PredictionMarket.Outcome.Yes : PredictionMarket.Outcome.No
        );
        if (buyYes) {
            ghostYesBought += amount;
            ghostYesByActor[wallet] += amount;
        } else {
            ghostNoBought += amount;
            ghostNoByActor[wallet] += amount;
        }
    }
}

contract PredictionMarketInvariants is StdInvariant, Test {
    PredictionMarket internal market;
    PredictionMarketHandler internal handler;
    uint256 internal marketId;

    function setUp() public {
        market = new PredictionMarket();
        marketId = market.createMarket("Invariant market", uint64(block.timestamp + 365 days));
        handler = new PredictionMarketHandler(market, marketId);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = PredictionMarketHandler.buy.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
        excludeContract(address(market));
    }

    function invariantPoolsEqualAcceptedBuys() public view {
        (,,,,,, uint256 yesPool, uint256 noPool,,,) = market.markets(marketId);
        assertEq(yesPool, handler.ghostYesBought());
        assertEq(noPool, handler.ghostNoBought());
        assertEq(address(market).balance, yesPool + noPool);
        for (uint256 index; index < 4; ++index) {
            address actor = handler.actors(index);
            assertEq(
                market.positions(marketId, actor, PredictionMarket.Outcome.Yes),
                handler.ghostYesByActor(actor)
            );
            assertEq(
                market.positions(marketId, actor, PredictionMarket.Outcome.No),
                handler.ghostNoByActor(actor)
            );
        }
    }
}

contract PredictionMarketClaimHandler is Test {
    PredictionMarket public immutable market;
    uint256 public immutable marketId;
    uint256 public immutable resolvedTotalPool;
    address[3] public actors;
    uint256 public successfulPayouts;
    mapping(address => uint256) public successfulClaims;
    mapping(address => uint256) public payoutByActor;

    constructor(
        PredictionMarket market_,
        uint256 marketId_,
        uint256 resolvedTotalPool_,
        address[3] memory actors_
    ) {
        market = market_;
        marketId = marketId_;
        resolvedTotalPool = resolvedTotalPool_;
        actors = actors_;
    }

    function claim(uint8 rawActorIndex) external {
        address actor = actors[bound(uint256(rawActorIndex), 0, actors.length - 1)];
        if (market.claimed(marketId, actor)) return;

        vm.prank(actor);
        uint256 payout = market.claimReward(marketId);
        successfulPayouts += payout;
        successfulClaims[actor] += 1;
        payoutByActor[actor] += payout;
    }
}

contract PredictionMarketClaimInvariants is StdInvariant, Test {
    PredictionMarket internal market;
    PredictionMarketClaimHandler internal handler;
    uint256 internal marketId;
    uint256 internal resolvedTotalPool;
    address[3] internal actors;

    function setUp() public {
        market = new PredictionMarket();
        uint64 closesAt = uint64(block.timestamp + 1 days);
        marketId = market.createMarket("Claim invariant market", closesAt);
        actors = [makeAddr("winner-1"), makeAddr("winner-2"), makeAddr("winner-3")];
        uint256[3] memory stakes = [uint256(1 gwei), uint256(2 gwei), uint256(3 gwei)];
        for (uint256 index; index < actors.length; ++index) {
            vm.deal(actors[index], stakes[index]);
            vm.prank(actors[index]);
            market.buyPosition{ value: stakes[index] }(marketId, PredictionMarket.Outcome.Yes);
        }
        address loser = makeAddr("loser");
        vm.deal(loser, 7 gwei);
        vm.prank(loser);
        market.buyPosition{ value: 7 gwei }(marketId, PredictionMarket.Outcome.No);
        resolvedTotalPool = 13 gwei;
        vm.warp(closesAt);
        market.resolveMarket(marketId, PredictionMarket.Outcome.Yes);

        handler = new PredictionMarketClaimHandler(market, marketId, resolvedTotalPool, actors);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = PredictionMarketClaimHandler.claim.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
        excludeContract(address(market));
    }

    function invariantSuccessfulPayoutsNeverExceedResolvedPool() public view {
        assertLe(handler.successfulPayouts(), resolvedTotalPool);
    }

    function invariantNoActorClaimsMoreThanOnce() public view {
        for (uint256 index; index < actors.length; ++index) {
            assertLe(handler.successfulClaims(actors[index]), 1);
        }
    }

    function invariantClaimedStateMatchesObservedBalanceChange() public view {
        for (uint256 index; index < actors.length; ++index) {
            address actor = actors[index];
            bool claimed = market.claimed(marketId, actor);
            assertEq(claimed, handler.successfulClaims(actor) == 1);
            assertEq(actor.balance, handler.payoutByActor(actor));
        }
    }

    function invariantPayoutAndContractBalancesAreConserved() public view {
        (,,,,,,,,, uint256 remainingPayout,) = market.markets(marketId);
        assertEq(handler.successfulPayouts() + remainingPayout, resolvedTotalPool);
        assertEq(address(market).balance, remainingPayout);
    }
}
