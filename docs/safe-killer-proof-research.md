# Safe Enforcement Killer-Proof Research

**Date:** 2026-08-07
**Sources:** safe-global/safe-smart-account (GitHub main), Safe docs
**Access Date:** 2026-08-07

## 1. Safe Guard Interface

From `safe-global/safe-smart-account/contracts/base/GuardManager.sol`:

```
interface ITransactionGuard is IERC165 {
    function checkTransaction(
        address to, uint256 value, bytes memory data,
        Enum.Operation operation, uint256 safeTxGas,
        uint256 baseGas, uint256 gasPrice, address gasToken,
        address payable refundReceiver, bytes memory signatures,
        address msgSender
    ) external;
    function checkAfterExecution(bytes32 hash, bool success) external;
}
```

## 2. Safe Execution Lifecycle

1. onBeforeExecTransaction(...)
2. txHash = getTransactionHash(...)  // EIP-712 hash
3. checkSignatures(...)              // owner sigs verified
4. guard = getGuard()
5. if guard != addr(0): guard.checkTransaction(to, value, data, ...)
6. execute(to, value, data, ...)     // CALL or DELEGATECALL
7. if guard != addr(0): guard.checkAfterExecution(txHash, success)

**If checkTransaction reverts → execTransaction reverts → execution BLOCKED.**

## 3. Guard Installation

setGuard(address) — only Safe owners (authorized). setGuard(address(0)) disables.

## 4. Can Safe Guard Enforce MarketLens Approvals?

YES. checkTransaction receives to/value/data — the 3 fields MarketLens must verify.

## 5. Off-chain vs On-chain

| Heavy policy evaluation | OFF-CHAIN |
| Approval signature | OFF-CHAIN |
| Target/value/calldata verification | ON-CHAIN (Guard) |
| Expiry check | ON-CHAIN |
| Signer verification | ON-CHAIN |
| Chain/account binding | ON-CHAIN |

## 6. Compatibility

Safe: >=0.7.0 <0.9.0. Project: 0.8.26. COMPATIBLE.
