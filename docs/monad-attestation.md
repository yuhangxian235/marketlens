# Monad Testnet Attestation Research

## Source
- **Official chain data:** https://github.com/ethereum-lists/chains/blob/master/_data/chains/eip155-10143.json
- **Verified:** 2026-08-06 via direct RPC call and `cast chain-id`

## Network Details

| Field | Value |
|-------|-------|
| Name | Monad Testnet |
| Chain ID | 10143 (0x279f) |
| Network ID | 10143 |
| Native Currency | MON (18 decimals) |
| RPC | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |
| EIP-1559 | Supported |
| Current Block | ~51.4M (2026-08-06) |

## RPC Capabilities

- `eth_chainId`: ✅ Works
- `eth_blockNumber`: ✅ Works
- `rpc_modules`: ❌ Method not found (RPC does not expose module listing)
- `debug_traceCall`: Untested — returned empty response without error on a minimal call

## Foundry Support

- Foundry version: 1.7.1 (2026-05-08)
- `cast chain-id --rpc-url https://testnet-rpc.monad.xyz`: Returns 10143 ✅
- Deployment: `forge create` and `forge script` should work with `--rpc-url https://testnet-rpc.monad.xyz`
- Verification: `forge verify-contract` may require explorer API key configuration

## Constraints

- debug_traceCall availability is unconfirmed — not needed for attestation contract
- Explorer verification may require authentication
- Testnet MON faucet availability not verified

## Attestation Strategy

The attestation contract records only bytes32 hashes — no user data, no proposal content, no private keys. It is a simple append-only registry for verified MarketLens batch receipt hashes on Monad Testnet.
