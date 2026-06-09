# Navet UI Guidelines

This document describes the current visual and interaction rules for Navet's shared UI.

## Product Goals

Navet should feel:

- glanceable on wall panels and tablets
- dense enough for real smart-home state
- deliberate rather than generic
- consistent across cards, settings, dialogs, and section views

## Current Theme Model

Supported themes:

- `glass`
- `dark`
- `light`
- `black`

Rules:

- resolve shared surfaces through theme helpers before writing feature-local theme branches
- keep `black` as a distinct high-contrast treatment
- use readable-text and surface-token helpers for tinted or accent-heavy surfaces
- keep card backgrounds theme-aware: `dark` and `black` should remain dark surfaces, while `glass` is the only theme that should use frosted or translucent glass-like card treatments
- when adding semantic or accent state styling, tint the current theme surface with border, glow, overlay, or text changes instead of replacing it with a different surface family
- when a card appears inside an established dashboard lane or neighboring card group, match the adjacent cards' surface treatment for the active theme before introducing any custom state styling
- custom state styling should layer on top of the inherited lane/card surface recipe, not replace it with a separate material treatment unless the exception is intentional and documented

## Shared Foundations

Current shared token foundations live in:

- `packages/app/src/components/system/tokens/foundations.ts`
- `packages/app/src/components/system/tokens/`
- `packages/app/src/components/shared/theme/`

Prefer these surfaces for:

- spacing
- typography roles
- border radii
- icon sizing
- motion and focus treatment
- semantic surface decisions

## Density And Input Rules

- optimize for mixed-input tablets and wall displays first
- keep touch targets comfortable and obvious
- do not rely on hover as the primary interaction affordance
- reduce simultaneous controls in compact card sizes

## Card Rules

- communicate the device or widget identity immediately
- keep the main control path obvious
- degrade cleanly across supported card sizes
- do not duplicate the same action in multiple parts of the card
- move overflow controls into dialogs rather than overloading compact card surfaces

## Shared UI Placement

- new generic reusable UI belongs in `packages/app/src/components/primitives/` or `patterns/`
- app-specific shared UI belongs in `packages/app/src/components/shared/`
- `packages/app/src/components/system/` is the curated export layer, not the default authoring location
- docs and story examples should prefer `@/app/ui-kit/*` when a stable shared export exists

## Performance Rules

- avoid expensive visual treatment in frequently updating or always-visible dashboard surfaces
- be careful with blur, nested layers, and animation on low-power hardware
- prefer CSS transforms and shared token logic over heavy per-card custom effects
