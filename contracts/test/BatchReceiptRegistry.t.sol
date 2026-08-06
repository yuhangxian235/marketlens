// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Test.sol";
import "../src/BatchReceiptRegistry.sol";

contract BatchReceiptRegistryTest is Test {
    BatchReceiptRegistry public registry;
    address publisher = address(0x123);

    bytes32 constant R_HASH = keccak256("receipt");
    bytes32 constant P_HASH = keccak256("policy");
    bytes32 constant A_HASH = keccak256("allowlist");
    bytes32 constant E_HASH = keccak256("evidence");

    function setUp() public {
        registry = new BatchReceiptRegistry();
    }

    function test_Attest_StoresFullRecord() public {
        vm.prank(publisher);
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);

        BatchReceiptRegistry.Attestation memory a = registry.getAttestation(R_HASH);
        assertEq(a.receiptHash, R_HASH);
        assertEq(a.policyHash, P_HASH);
        assertEq(a.allowlistHash, A_HASH);
        assertEq(a.evidenceHash, E_HASH);
        assertEq(a.publisher, publisher);
        assertGt(a.timestamp, 0);
    }

    function test_Attest_EmitEvent() public {
        vm.expectEmit(true, true, false, true);
        emit BatchReceiptRegistry.BatchReceiptAttested(
            R_HASH, P_HASH, A_HASH, E_HASH, publisher, uint64(block.timestamp)
        );
        vm.prank(publisher);
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);
    }

    function test_Attest_PublisherIsMsgSender() public {
        vm.prank(publisher);
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);
        assertEq(registry.getAttestation(R_HASH).publisher, publisher);
    }

    function test_Attest_TimestampUsesBlockTimestamp() public {
        vm.warp(1_700_000_000);
        vm.prank(publisher);
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);
        assertEq(registry.getAttestation(R_HASH).timestamp, 1_700_000_000);
    }

    function test_Attest_ZeroReceiptHash_Reverts() public {
        vm.prank(publisher);
        vm.expectRevert(BatchReceiptRegistry.ZeroReceiptHash.selector);
        registry.attest(bytes32(0), P_HASH, A_HASH, E_HASH);
    }

    function test_Attest_DuplicateReceiptHash_Reverts() public {
        vm.prank(publisher);
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);

        vm.prank(publisher);
        vm.expectRevert(
            abi.encodeWithSelector(BatchReceiptRegistry.AlreadyAttested.selector, R_HASH)
        );
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);
    }

    function test_Attest_DuplicateDifferentFields_Reverts() public {
        vm.prank(publisher);
        registry.attest(R_HASH, P_HASH, A_HASH, E_HASH);

        vm.prank(publisher);
        vm.expectRevert(
            abi.encodeWithSelector(BatchReceiptRegistry.AlreadyAttested.selector, R_HASH)
        );
        registry.attest(R_HASH, bytes32(uint256(99)), A_HASH, E_HASH);
    }

    function test_Receive_ETHReverts() public {
        vm.prank(publisher);
        (bool ok,) = address(registry).call{ value: 1 ether }("");
        assertFalse(ok);
    }

    function test_GetAttestation_MissingReceipt_ReturnsEmpty() public {
        BatchReceiptRegistry.Attestation memory a = registry.getAttestation(R_HASH);
        assertEq(a.receiptHash, bytes32(0));
        assertEq(a.publisher, address(0));
        assertEq(a.timestamp, 0);
    }
}
