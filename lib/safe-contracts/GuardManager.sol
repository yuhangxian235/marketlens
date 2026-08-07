// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.7.0 <0.9.0;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface ITransactionGuard is IERC165 {
    function checkTransaction(
        address to, uint256 value, bytes memory data,
        uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice,
        address gasToken, address payable refundReceiver,
        bytes memory signatures, address msgSender
    ) external;
    function checkAfterExecution(bytes32 hash, bool success) external;
}

abstract contract BaseTransactionGuard is ITransactionGuard {
    function supportsInterface(bytes4 interfaceId) external view virtual override returns (bool) {
        return interfaceId == type(ITransactionGuard).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
