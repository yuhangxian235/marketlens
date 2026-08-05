# Moss Upstream Provenance

- **Upstream project:** Moss
- **Upstream repository:** <https://github.com/nishuzumi/moss>
- **Pinned upstream commit:** `d09b38cbc44ee7f5722c5d09e7224f7750187762` (2026-07-22)
- **License:** MIT
- **Vendoring date:** 2026-08-05
- **Included packages:**
  - `@themoss/core` (`packages/core/`)
  - `@themoss/simulator` (`packages/simulator/`)
- **Excluded upstream packages:** `abi-tools`, `erc`, `system`, `mcp-server`, `protocols/*`, `examples/*`
- **Excluded files:** `.changeset`, `.github`, `.claude`, `docs/`, `examples/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.git/`
- **Modifications to upstream source:** None. Source is vendored as-is from the pinned commit.
- **How to update:** Clone upstream at the desired commit and replace `packages/core/` and `packages/simulator/` with the updated source.

## Verification note

Due to network constraints at vendoring time, the source was verified against the
upstream repository reference documented in `docs/moss_research.md`. The vendored
source is expected to match the upstream commit `d09b38c`.
