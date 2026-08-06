// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import "../src/BatchReceiptRegistry.sol";

/// @notice Publish a batch receipt attestation to the deployed registry.
/// @dev Reads hashes from environment variables.
/// Usage:
///   RECEIPT_HASH=0x... POLICY_HASH=0x... ALLOWLIST_HASH=0x... EVIDENCE_HASH=0x...
///   forge script script/PublishBatchReceipt.s.sol --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
contract PublishBatchReceipt is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("MONAD_TESTNET_PRIVATE_KEY");
        address registryAddr = vm.envAddress("BATCH_RECEIPT_REGISTRY_ADDRESS");

        bytes32 receiptHash = vm.envBytes32("RECEIPT_HASH");
        bytes32 policyHash = vm.envBytes32("POLICY_HASH");
        bytes32 allowlistHash = vm.envBytes32("ALLOWLIST_HASH");
        bytes32 evidenceHash = vm.envBytes32("EVIDENCE_HASH");

        require(receiptHash != bytes32(0), "RECEIPT_HASH must be non-zero");
        require(registryAddr != address(0), "BATCH_RECEIPT_REGISTRY_ADDRESS not set");
        require(registryAddr.code.length > 0, "No contract at registry address");

        // Verify chain ID matches Monad Testnet
        uint256 chainId = block.chainid;
        require(chainId == 10143, "Wrong chain - deploy to Monad Testnet (10143)");

        vm.startBroadcast(deployerKey);
        BatchReceiptRegistry(registryAddr)
            .attest(receiptHash, policyHash, allowlistHash, evidenceHash);
        vm.stopBroadcast();

        console.log("Attestation published for receipt:", vm.toString(receiptHash));
    }
}
