// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script } from "forge-std/Script.sol";
import { PredictionMarket } from "../src/PredictionMarket.sol";

contract DeployPredictionMarket is Script {
    function run() external returns (PredictionMarket deployed) {
        vm.startBroadcast();
        deployed = new PredictionMarket();
        vm.stopBroadcast();
    }
}

