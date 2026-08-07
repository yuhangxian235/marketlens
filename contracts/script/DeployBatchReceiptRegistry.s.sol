// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import "../src/BatchReceiptRegistry.sol";

/// @notice Deploy BatchReceiptRegistry to Monad Testnet.
/// @dev Reads MONAD_TESTNET_PRIVATE_KEY from environment.
/// Usage: forge script script/DeployBatchReceiptRegistry.s.sol --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
contract DeployBatchReceiptRegistry is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("MONAD_TESTNET_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        BatchReceiptRegistry registry = new BatchReceiptRegistry();

        vm.stopBroadcast();

        console.log("BatchReceiptRegistry deployed at:", address(registry));
    }
}
