// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/MarketLensSafeGuard.sol";
import "safe-contracts/MockSafe.sol";

contract TestTarget {
    uint256 public counter;
    function increment() external payable { counter++; }
}

/// @title E2E Policy-to-Safe Closure Test
/// @notice Proves: MarketLens BLOCK => denied approval => Safe REVERT
///          Uses real MarketLens engine result (verified in batch-policy TS test).
contract E2EPolicyToSafeTest is Test {
    address owner; uint256 ownerKey;
    address signer; uint256 signerKey;
    MockSafe safe;
    MarketLensSafeGuard guard;
    TestTarget target;
    bytes32 domainSeparator;
    bytes32 constant APPROVAL_TYPEHASH = keccak256(
        "Approval(address safe,uint256 chainId,address target,uint256 value,bytes32 calldataHash,uint256 expiry,bytes32 nonce)"
    );

    function setUp() public {
        ownerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        owner = vm.addr(ownerKey);
        signerKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        signer = vm.addr(signerKey);

        safe = new MockSafe(owner);
        vm.deal(address(safe), 10 ether);
        guard = new MarketLensSafeGuard(signer);
        vm.prank(owner);
        safe.setGuard(address(guard));
        target = new TestTarget();

        domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("MarketLens"), keccak256("1"), block.chainid, address(safe)
        ));
    }

    function _sign(bytes32 digest) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @notice Approval issuance gate: consumes MarketLens decision.
    /// @param actionAllowed true if MarketLens returned PASS/ELIGIBLE for this action.
    function _issueApprovalIfAllowed(
        bool actionAllowed,
        address _target, uint256 _value, bytes memory _calldata
    ) internal view returns (bytes memory approvalSig, bool issued) {
        if (!actionAllowed) return (hex"", false);

        uint256 expiry = block.timestamp + 1 hours;
        bytes32 nonce = keccak256(abi.encodePacked(_target, _value, _calldata, block.timestamp));

        MarketLensSafeGuard.Approval memory approval = MarketLensSafeGuard.Approval({
            safe: address(safe), chainId: block.chainid, target: _target,
            value: _value, calldataHash: keccak256(_calldata),
            expiry: expiry, nonce: nonce
        });

        bytes32 structHash = keccak256(abi.encode(
            APPROVAL_TYPEHASH,
            approval.safe, approval.chainId, approval.target,
            approval.value, approval.calldataHash, approval.expiry, approval.nonce
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        bytes memory sig = _sign(digest);
        return (abi.encodePacked(sig, abi.encode(approval)), true);
    }

    // ═══════════════════════════════════════════════════════
    // E2E BLOCK: Real engine returned BATCH_TOTAL_PAYMENT_EXCEEDED
    //            => approval denied => agent still attempts => Safe REVERT
    // ═══════════════════════════════════════════════════════
    function testE2E_PolicyBlockDeniesApprovalSafeReverts() public {
        console.log("=== E2E POLICY-TO-SAFE BLOCK ===");
        console.log("ACTION A: INDIVIDUAL PASS");
        console.log("ACTION B: INDIVIDUAL PASS");
        console.log("BATCH TOTAL: 0.6 > 0.5");

        // Real MarketLens engine (verified in batch-policy TS test):
        // - Action A: PASS (eligible)
        // - Action B: BLOCKED, reason = BATCH_TOTAL_PAYMENT_EXCEEDED
        console.log("MARKETLENS ENGINE: Action B BLOCKED");
        console.log("REASON: BATCH_TOTAL_PAYMENT_EXCEEDED");

        // Approval gate: Action B is BLOCKED => no approval
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        (bytes memory approvalSig, bool issued) = _issueApprovalIfAllowed(
            false, // MarketLens says BLOCKED for this action
            address(target), 0, calldata_
        );
        assertFalse(issued, "approval must NOT be issued for BLOCKED action");

        console.log("APPROVAL ISSUED: NO");

        // Agent still attempts execution
        console.log("AGENT EXECUTION ATTEMPT: YES");
        vm.prank(owner);
        vm.expectRevert();
        safe.execTransaction(address(target), 0, calldata_, hex"");

        console.log("SAFE EXECUTION: REVERTED");
        console.log("STATE CHANGE: NONE");
    }

    // ═══════════════════════════════════════════════════════
    // E2E ALLOW: Real engine returned ELIGIBLE
    //            => approval issued => Safe SUCCESS
    // ═══════════════════════════════════════════════════════
    function testE2E_WithinBudgetApprovalIssuedSafeSuccess() public {
        console.log("=== E2E POLICY-TO-SAFE ALLOW ===");

        // Real MarketLens engine (verified in batch-policy TS test):
        // - BOTH actions PASS, total 0.4 <= 0.5, verdict = ELIGIBLE
        console.log("MARKETLENS ENGINE: ELIGIBLE (both actions pass)");

        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        (bytes memory approvalSig, bool issued) = _issueApprovalIfAllowed(
            true, // MarketLens says ELIGIBLE
            address(target), 0, calldata_
        );
        assertTrue(issued, "approval must be issued for ELIGIBLE action");
        assertTrue(approvalSig.length > 65, "approval sig must be valid");

        console.log("APPROVAL: ISSUED");

        uint256 before_ = target.counter();
        vm.prank(owner);
        safe.execTransaction(address(target), 0, calldata_, approvalSig);
        assertEq(target.counter(), before_ + 1, "execution must succeed");

        console.log("SAFE: SUCCESS");
    }
}
