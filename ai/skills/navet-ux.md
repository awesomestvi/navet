# Navet UX

Read this file before changing dashboard layout, card behavior, settings flows, or the visual hierarchy of core screens.

## Product Direction

- Navet is not a clone of Home Assistant's default dashboard.
- Navet should feel premium, polished, glanceable, and wall-panel friendly.
- The first screen should prioritize useful dynamic cards.

## Interaction Rules

- Avoid dense configuration screens.
- Use progressive disclosure.
- Touch targets must be suitable for wall tablets and kiosk use.
- Avoid UI clutter.
- Avoid over-contained panels and excessive rounded boxes.
- Prefer one-tap or low-friction actions for common household controls.
- Keep live state readable from a distance.

## Visual Identity

Preserve Navet's visual identity:

- clean smart-home aesthetic
- light, dark, black, and liquid-glass themes
- accent color `#ffcc33` where appropriate

## Information Hierarchy

Prefer a clear hierarchy:

- primary information
- secondary information
- metadata
- advanced controls hidden until needed

## Design Guardrails

- Default to glanceability over configuration density.
- Do not bury key live-home information behind edit-first surfaces.
- Keep dashboard behavior intentional for kiosk and always-on tablet usage.
- New UI should reuse the existing theme and primitive system before introducing new visual patterns.
- The default experience should optimize for "walk up and use it", not "open settings and configure it".

## What Not To Do

- Do not clone Home Assistant Lovelace layouts or terminology by default.
- Do not let settings or edit-mode affordances dominate the primary dashboard surface.
- Do not add stacks of nested cards, pills, and rounded shells that reduce information density without improving clarity.
- Do not hide important live state behind dialogs if it belongs on the main card.
- Do not optimize for desktop mouse precision at the expense of wall-tablet touch usage.

## Known Navet Failure Modes To Guard Against

- generic smart-home UI that loses Navet's identity
- screens that look polished in isolation but are too dense or fiddly on a wall tablet
- over-contained card designs that waste space and bury the actual device state
- adding controls before confirming that the first-screen summary remains glanceable

## Required Routing

Read this file before changing:

- `src/app/features/dashboard/`
- `src/app/features/media/`
- `src/app/features/security/`
- `src/app/features/lighting/`
- `src/app/features/climate/`
- `src/app/features/settings/`
- shared visual primitives under `src/app/components/`

If the change also affects theme placement or shared surfaces, read `docs/agents/ui-and-theming.md`.
