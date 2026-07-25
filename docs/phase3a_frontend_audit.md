# Phase 3A Frontend Audit

## Routes

| Route | Type | Visibility |
|-------|------|------------|
| `/` (home) | JUDGE_PRIMARY | Public landing page |
| `/demo` | JUDGE_PRIMARY | Main demo experience |
| `/markets` | JUDGE_SECONDARY | Market list |
| `/product-analytics` | JUDGE_SECONDARY | Analytics dashboard |
| `/evidence/[metricId]` | TECHNICAL_EVIDENCE | 15 metric detail pages |
| `/action` | TECHNICAL_EVIDENCE | Action workbench |
| `/_not-found` | INTERNAL | 404 page |

## Changes Made
1. `/` — Replaced redirect with landing page (hero + demo CTA + status grid)
2. `/demo` — NEW: 8-step judge demo with evidence, intent, simulation, receipt, checks
3. Layout — Fixed Monad reference → "Local Anvil", updated nav, fixed status badges
4. Nav — Added Demo as primary entry, reordered

## 390px Check
- Demo page uses responsive layout with flex-wrap
- No horizontal overflow on status badges
- Step content uses margin-left: 36px (fixed indent, acceptable at 390px)
- All text within max-width: 800px container

