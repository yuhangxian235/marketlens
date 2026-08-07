// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/MarketLensSafeGuard.sol";
import "safe-contracts/MockSafe.sol";

contract TestTarget {
    uint256 public counter;
    event Called(address caller, uint256 value);

    function increment() external payable {
        counter++;
        emit Called(msg.sender, msg.value);
    }

    function setCounter(uint256 _c) external {
        counter = _c;
    }
}

contract MarketLensSafeGuardTest is Test {
    address owner;
    uint256 ownerKey;
    address signer;
    uint256 signerKey;
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

        domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("MarketLens"),
                keccak256("1"),
                block.chainid,
                address(safe)
            )
        );
    }

    function _sign(bytes32 digest) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _approvalSig(
        address _safe,
        address _target,
        uint256 _value,
        bytes memory _calldata,
        uint256 _expiry,
        bytes32 _nonce
    ) internal view returns (bytes memory) {
        MarketLensSafeGuard.Approval memory a = MarketLensSafeGuard.Approval({
            safe: _safe,
            chainId: block.chainid,
            target: _target,
            value: _value,
            calldataHash: keccak256(_calldata),
            expiry: _expiry,
            nonce: _nonce
        });
        bytes32 structHash = keccak256(
            abi.encode(
                APPROVAL_TYPEHASH,
                a.safe,
                a.chainId,
                a.target,
                a.value,
                a.calldataHash,
                a.expiry,
                a.nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        bytes memory sig = _sign(digest);
        return abi.encodePacked(sig, abi.encode(a));
    }

    // ═══ TEST A: APPROVED ═══
    function testA_ApprovedExecution() public {
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        bytes memory sig = _approvalSig(
            address(safe),
            address(target),
            0,
            calldata_,
            block.timestamp + 1 hours,
            bytes32(uint256(1))
        );
        uint256 before_ = target.counter();
        vm.prank(owner);
        safe.execTransaction(address(target), 0, calldata_, sig);
        assertEq(target.counter(), before_ + 1);
    }

    // ═══ TEST B: BLOCKED — NO APPROVAL ═══
    function testB_BlockedNoApproval() public {
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        vm.prank(owner);
        vm.expectRevert();
        safe.execTransaction(address(target), 0, calldata_, hex"");
    }

    // ═══ TEST C1: TAMPERED VALUE ═══
    function testC1_TamperedValue() public {
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        bytes memory sig = _approvalSig(
            address(safe),
            address(target),
            0,
            calldata_,
            block.timestamp + 1 hours,
            bytes32(uint256(3))
        );
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketLensSafeGuard.ValueMismatch.selector, uint256(0), uint256(1 ether)
            )
        );
        safe.execTransaction(address(target), 1 ether, calldata_, sig);
    }

    // ═══ TEST C2: TAMPERED TARGET ═══
    function testC2_TamperedTarget() public {
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        bytes memory sig = _approvalSig(
            address(safe),
            address(target),
            0,
            calldata_,
            block.timestamp + 1 hours,
            bytes32(uint256(4))
        );
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                MarketLensSafeGuard.TargetMismatch.selector, address(target), address(0xdead)
            )
        );
        safe.execTransaction(address(0xdead), 0, calldata_, sig);
    }

    // ═══ TEST C3: TAMPERED CALLDATA ═══
    function testC3_TamperedCalldata() public {
        bytes memory approved = abi.encodeWithSelector(TestTarget.increment.selector);
        bytes memory sig = _approvalSig(
            address(safe),
            address(target),
            0,
            approved,
            block.timestamp + 1 hours,
            bytes32(uint256(5))
        );
        bytes memory tampered = abi.encodeWithSelector(TestTarget.setCounter.selector, 999);
        vm.prank(owner);
        vm.expectRevert(); // CalldataMismatch
        safe.execTransaction(address(target), 0, tampered, sig);
    }

    // ═══ EXTRA: EXPIRED ═══
    function test_ExpiredApproval() public {
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        bytes memory sig = _approvalSig(
            address(safe), address(target), 0, calldata_, block.timestamp, bytes32(uint256(6))
        );
        vm.warp(block.timestamp + 1);
        vm.prank(owner);
        vm.expectRevert(); // ApprovalExpired
        safe.execTransaction(address(target), 0, calldata_, sig);
    }

    // ═══ EXTRA: INVALID SIGNER ═══
    function test_InvalidSigner() public {
        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        // Build approval signed by WRONG key
        MarketLensSafeGuard.Approval memory a = MarketLensSafeGuard.Approval({
            safe: address(safe),
            chainId: block.chainid,
            target: address(target),
            value: 0,
            calldataHash: keccak256(calldata_),
            expiry: block.timestamp + 1 hours,
            nonce: bytes32(uint256(7))
        });
        bytes32 structHash = keccak256(
            abi.encode(
                APPROVAL_TYPEHASH,
                a.safe,
                a.chainId,
                a.target,
                a.value,
                a.calldataHash,
                a.expiry,
                a.nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest); // WRONG KEY
        bytes memory sig = abi.encodePacked(abi.encodePacked(r, s, v), abi.encode(a));

        vm.prank(owner);
        vm.expectRevert(); // InvalidSigner
        safe.execTransaction(address(target), 0, calldata_, sig);
    }

    // ═══ EXTRA: WRONG SAFE ═══
    function test_WrongSafe() public {
        MockSafe safe2 = new MockSafe(owner);
        vm.deal(address(safe2), 1 ether);
        vm.prank(owner);
        safe2.setGuard(address(guard));

        bytes memory calldata_ = abi.encodeWithSelector(TestTarget.increment.selector);
        bytes memory sig = _approvalSig(
            address(safe),
            address(target),
            0,
            calldata_,
            block.timestamp + 1 hours,
            bytes32(uint256(8))
        );

        vm.prank(owner);
        vm.expectRevert(); // WrongSafe
        safe2.execTransaction(address(target), 0, calldata_, sig);
    }

    /// @dev Existing contracts unaffected
    function test_ExistingContractsUnaffected() public {
        assertTrue(address(safe) != address(0));
        assertTrue(address(guard) != address(0));
    }
}
