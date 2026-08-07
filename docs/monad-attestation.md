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


## Deployment Record (2026-08-07)

| Field | Value |
|-------|-------|
| Registry address | `0x85AD7b41DC64d8E191A9Dc56B398068341c54203` |
| Deployer | `0xD6961013198f5053b6309A2c1F30DD091AB66A69` |
| Deployment TX | `0x9649d1644046fe74032198ff5197f595f9250c2fb8c856bb2cda65ada3827730` |
| Deployment block | 51539658 |
| Attestation TX | `0x6ab6de991889f88fe5906fc0e679ca53eeb55e0369a34772c519a62ff477fe52` |
| Attestation block | 51540389 |
| Receipt hash | `0xc4d63e36cc55f237dc715d478e0f48d48b5995e151c21166287530ed73a9d0be` |
| Policy hash | `0xb457c3bd4ede5a988e4c21f0d58c30fa5e74ad818db12e6b8a20c002d274ccc6` |
| Allowlist hash | `0x01decf7f76428b8903e89e10f6dd8e7a275e48541beed4eb3e3482da8988c4ef` |
| Evidence hash | `0xae16a1b6e80400246b2de8298c2ea53f37072ad31f9e66ebbd9fa851b2720dee` |
| On-chain readback | ✅ All 4 hashes + publisher verified |
| Event verification | ✅ BatchReceiptAttested event confirmed |
| Contract verification | Code confirmed on-chain; explorer verification gated by Cloudflare |

Explorer: [Registry](https://testnet.monadexplorer.com/address/0x85AD7b41DC64d8E191A9Dc56B398068341c54203) | [Deployment TX](https://testnet.monadexplorer.com/tx/0x9649d1644046fe74032198ff5197f595f9250c2fb8c856bb2cda65ada3827730) | [Attestation TX](https://testnet.monadexplorer.com/tx/0x6ab6de991889f88fe5906fc0e679ca53eeb55e0369a34772c519a62ff477fe52)
