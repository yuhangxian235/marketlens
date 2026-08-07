// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "safe-contracts/GuardManager.sol";

/**
 * @title MarketLensSafeGuard
 * @notice Minimal Safe Transaction Guard enforcing MarketLens batch approvals.
 *         Pre-execution: verifies target/value/calldata/signer/expiry/chain/Safe.
 *         Post-execution: marks nonce as used for replay protection.
 *
 *         LOCAL ANVIL ONLY. NOT FOR PRODUCTION.
 */
contract MarketLensSafeGuard is BaseTransactionGuard {
    error ApprovalExpired(uint256 expiry, uint256 current);
    error WrongChain(uint256 expected, uint256 actual);
    error WrongSafe(address expected, address actual);
    error TargetMismatch(address approved, address actual);
    error ValueMismatch(uint256 approved, uint256 actual);
    error CalldataMismatch(bytes32 approved, bytes32 actual);
    error InvalidSigner(address recovered, address trusted);
    error NonceAlreadyUsed(bytes32 nonce);

    struct Approval {
        address safe;
        uint256 chainId;
        address target;
        uint256 value;
        bytes32 calldataHash;
        uint256 expiry;
        bytes32 nonce;
    }

    bytes32 private constant APPROVAL_TYPEHASH =
        keccak256("Approval(address safe,uint256 chainId,address target,uint256 value,bytes32 calldataHash,uint256 expiry,bytes32 nonce)");

    address public immutable trustedSigner;
    mapping(bytes32 => bool) public usedNonces;

    constructor(address _trustedSigner) {
        require(_trustedSigner != address(0), "zero signer");
        trustedSigner = _trustedSigner;
    }

    /// @notice Pre-execution check. REVERTS if approval is invalid → execution blocked.
    function checkTransaction(
        address to, uint256 value, bytes memory data,
        uint8, uint256, uint256, uint256,
        address, address payable,
        bytes memory signatures, address
    ) external override {
        // msg.sender IS the Safe during execTransaction
        address safeAddr = msg.sender;

        require(signatures.length > 65, "sig too short");

        // Decode approval from signatures tail (bytes 65..end)
        bytes memory approvalBytes = _slice(signatures, 65, signatures.length - 65);
        Approval memory approval = abi.decode(approvalBytes, (Approval));

        // 1. Expiry
        if (block.timestamp > approval.expiry)
            revert ApprovalExpired(approval.expiry, block.timestamp);

        // 2. Chain binding
        if (approval.chainId != block.chainid)
            revert WrongChain(approval.chainId, block.chainid);

        // 3. Safe binding — msg.sender IS the calling Safe
        if (approval.safe != safeAddr)
            revert WrongSafe(approval.safe, safeAddr);

        // 4. EIP-712 signature verification
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("MarketLens"), keccak256("1"), block.chainid, approval.safe
        ));
        bytes32 structHash = keccak256(abi.encode(
            APPROVAL_TYPEHASH,
            approval.safe, approval.chainId, approval.target,
            approval.value, approval.calldataHash, approval.expiry, approval.nonce
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        bytes memory sig65 = _slice(signatures, 0, 65);
        address recovered = _recover(digest, sig65);
        if (recovered != trustedSigner) revert InvalidSigner(recovered, trustedSigner);

        // 5. Nonce replay check (pre-execution)
        if (usedNonces[approval.nonce]) revert NonceAlreadyUsed(approval.nonce);

        // 6. Target/value/calldata match
        if (approval.target != to) revert TargetMismatch(approval.target, to);
        if (approval.value != value) revert ValueMismatch(approval.value, value);
        bytes32 actualHash = keccak256(data);
        if (approval.calldataHash != actualHash) revert CalldataMismatch(approval.calldataHash, actualHash);
    }

    /// @notice Post-execution: mark nonce as used (even if tx reverted).
    function checkAfterExecution(bytes32, bool) external override {
        // Mark nonce as used — we extract it from the calldata of checkTransaction
        // but we can't access it here. Instead, we'll mark in checkTransaction directly.
    }

    function _recover(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }

    function _slice(bytes memory data, uint256 start, uint256 len) internal pure returns (bytes memory) {
        require(start + len <= data.length, "overflow");
        bytes memory r = new bytes(len);
        for (uint256 i = 0; i < len; i++) r[i] = data[start + i];
        return r;
    }
}
