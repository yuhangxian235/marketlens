# Hosted Verified Demo

## Recommended platform
Vercel (zero-config Next.js deployment), or any Next.js-compatible host.

## Environment variables
Set in platform dashboard — no values committed:

| Variable | Required | Purpose |
|----------|----------|---------|
| `MARKETLENS_ANVIL_RPC` | No | Only needed for Live Local Lab (local only) |

## Build & start

```bash
pnpm install --frozen-lockfile
pnpm --filter @marketlens/web build
pnpm --filter @marketlens/web start
```

## What works in Hosted

- Verified Demo (five-action pre-generated evidence) — fully functional
- Policy switching (Strict / Default / Permissive)
- Batch receipt inspection
- Unsigned allowlist download
- Monad Attestation Proof display (static artifact)
- Architecture overview and analytics pages

## What requires local

- **Live Local Lab** — requires a local Anvil instance on port 8546 with chain ID 143
  - Start: `pnpm demo:live` (runs `scripts/fixture.sh`)
  - API: `POST /api/verify-live-batch` returns 503 if Anvil unavailable
  - The Live Lab gracefully degrades — page does not crash
- **Fresh evidence generation** — only available via Live Local Lab
- **Monad attestation publishing** — requires deployer wallet and testnet MON

## Safety

- No wallet connection in hosted environment
- No user signing or broadcast
- No real funds
- User agent actions remain unsigned and unbroadcast
- Monad attestation display is read-only static data
