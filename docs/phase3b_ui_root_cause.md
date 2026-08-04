# Phase 3B-R2 UI Root Cause Analysis

## Problem Summary

Current pages render with white backgrounds, narrow widths (~720px on desktop), 
and inconsistent styling between inline dark styles and the light-themed globals.css.

## Root Causes

### 1. White Body Background
- `globals.css`:25-27 — `html { background: var(--paper); }` where `--paper: #f6f7fb` (light gray)
- `globals.css`:29-38 — `body` inherits light paper background with grid pattern
- Only `<main>` on homepage/demo has inline dark background `#0f1117`
- Result: a narrow dark stripe surrounded by white

### 2. Narrow 720px Layout
- `page.tsx`:5 — `<main style={{ maxWidth: 720 }}>` hardcodes narrow width
- `demo/page.tsx`:49 — `<main style={{ maxWidth: 800 }}>` hardcodes narrow width
- Neither page uses the global `.pageGrid` or `.pageCanvas` classes
- Desktop has 1440px available but content uses only 720-800px

### 3. Nav Links Appearance
- `globals.css`:119-128 — Nav links colored `#3c4560` on light header background
- When page content is dark-themed, the contrast mismatch makes links look unstyled
- Font sizes are very small (9px-13px) in the nav area
- The 3-column grid layout for header may break on some widths

### 4. Light/Dark Theme Inconsistency
- `globals.css` is entirely designed for light theme (`--paper: #f6f7fb`, `--surface: #ffffff`)
- Homepage and Demo page override with inline dark styles
- Other pages (markets, evidence, action) still use light theme
- Creates visual inconsistency across routes

### 5. Layout.tsx No Global Container
- `<body>` wraps children directly, no max-width container
- Each page must independently set its own layout width
- No shared page wrapper component

### 6. Demo Page Design
- 8 steps vertically stacked in identical black rectangles
- No visual hierarchy between steps
- No two-column Progress Rail for navigation
- Info density too low for desktop presenter mode
- Scene switcher hidden below main content

### 7. Homepage Design
- Single-column narrow card
- No two-column Hero with product preview
- No problem/solution flow
- No value cards with visual elements
- Status grid uses raw green/amber inline colors

## Fix Strategy

1. Complete globals.css rewrite → dark theme
2. New layout.tsx → full-width dark navbar + global container
3. New page.tsx → two-column Hero + value cards
4. New demo/page.tsx → two-column with Progress Rail
