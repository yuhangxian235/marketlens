// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title BatchReceiptRegistry
/// @notice Minimal append-only registry for MarketLens batch verification receipt hashes on Monad Testnet.
/// @dev Records only bytes32 hashes — no user data, no proposal content, no private keys. No funds, no admin.
contract BatchReceiptRegistry {
    struct Attestation {
        bytes32 receiptHash;
        bytes32 policyHash;
        bytes32 allowlistHash;
        bytes32 evidenceHash;
        address publisher;
        uint64 timestamp;
    }

    event BatchReceiptAttested(
        bytes32 indexed receiptHash,
        bytes32 indexed policyHash,
        bytes32 allowlistHash,
        bytes32 evidenceHash,
        address indexed publisher,
        uint64 timestamp
    );

    mapping(bytes32 => Attestation) private _attestations;

    error AlreadyAttested(bytes32 receiptHash);
    error ZeroReceiptHash();

    function attest(
        bytes32 receiptHash,
        bytes32 policyHash,
        bytes32 allowlistHash,
        bytes32 evidenceHash
    ) external {
        if (receiptHash == bytes32(0)) revert ZeroReceiptHash();
        if (_attestations[receiptHash].publisher != address(0)) {
            revert AlreadyAttested(receiptHash);
        }

        Attestation memory a = Attestation({
            receiptHash: receiptHash,
            policyHash: policyHash,
            allowlistHash: allowlistHash,
            evidenceHash: evidenceHash,
            publisher: msg.sender,
            timestamp: uint64(block.timestamp)
        });
        _attestations[receiptHash] = a;

        emit BatchReceiptAttested(
            receiptHash, policyHash, allowlistHash, evidenceHash, msg.sender, a.timestamp
        );
    }

    function getAttestation(bytes32 receiptHash) external view returns (Attestation memory) {
        return _attestations[receiptHash];
    }
}
