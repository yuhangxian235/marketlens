// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./GuardManager.sol";

contract MockSafe {
    address public guard;
    uint256 public nonce;
    mapping(address => bool) public isOwner;

    event ExecutionSuccess(bytes32 txHash, uint256 payment);
    event ExecutionFailure(bytes32 txHash, uint256 payment);

    constructor(address _owner) {
        isOwner[_owner] = true;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    function setGuard(address _guard) external onlyOwner {
        guard = _guard;
    }

    function getGuard() external view returns (address) {
        return guard;
    }

    function execTransaction(
        address to, uint256 value, bytes memory data, bytes memory signatures
    ) external onlyOwner returns (bool success) {
        bytes32 txHash = keccak256(abi.encode(to, value, data, nonce++));

        if (guard != address(0)) {
            ITransactionGuard(guard).checkTransaction(
                to, value, data,
                0, 0, 0, 0, address(0), payable(address(0)),
                signatures, msg.sender
            );
        }

        (success,) = to.call{value: value}(data);

        if (success) emit ExecutionSuccess(txHash, 0);
        else emit ExecutionFailure(txHash, 0);

        if (guard != address(0)) {
            ITransactionGuard(guard).checkAfterExecution(txHash, success);
        }

        return success;
    }

    receive() external payable {}
}
