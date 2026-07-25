// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script } from "forge-std/Script.sol";
import { PredictionMarket } from "../src/PredictionMarket.sol";

/// @notice Creates the three deterministic demo markets.
/// @dev Wallet buys, time travel, resolution, and claims are orchestrated by
///      scripts/demo.ps1 so every RPC transaction is captured by the indexer.
contract SeedDemoMarkets is Script {
    function run() external returns (uint256 firstMarketId) {
        PredictionMarket market =
            PredictionMarket(payable(vm.envAddress("PREDICTION_MARKET_ADDRESS")));
        uint64 closesAt = uint64(block.timestamp + 3 days);

        vm.startBroadcast();
        firstMarketId = market.createMarket("Will Monad ship feature A?", closesAt);
        market.createMarket("Will weekly active wallets grow?", closesAt);
        market.createMarket("Will the demo market enter refund mode?", closesAt);
        vm.stopBroadcast();
    }
}

