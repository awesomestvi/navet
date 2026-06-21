# Navet UX

Read this file before changing dashboard layout, card behavior, section composition, settings
surfaces, or core visual hierarchy.

## Product Direction

- Navet should feel premium, glanceable, and wall-panel friendly
- the first screen should prioritize useful live information and obvious controls
- avoid generic smart-home UI that could be mistaken for any other dashboard

## Interaction Rules

- prefer low-friction actions for common household controls
- avoid burying important live state behind edit-first flows
- keep touch targets suitable for kiosk and tablet use
- use progressive disclosure instead of dense always-visible configuration

## Visual Rules

- preserve Navet's current theme model: `glass`, `dark`, `light`, `black`
- reuse the existing shared UI and theme system before inventing new patterns
- keep surfaces theme-native: in `dark` and `black`, cards should stay dark-surface cards, not glass or frosted treatments
- use accent color as tint, border, glow, or emphasis inside the active theme surface instead of swapping the surface family
- when a card needs to become accent-aware, prefer shared surface helpers such as the existing accent/tinted card tokens instead of feature-local gradient recipes
- when a card sits beside adjacent cards in an established lane or section, inherit that same surface family first; do not make one card look like a different theme or material system
- in dashboard pairs or lanes, prefer the same shared card recipe across neighboring cards; for example, the energy dashboard `Sources` card should stay in the same surface family as `Live Energy`, but may become accent-aware by layering a shared accent surface helper on top of that family rather than switching to a feature-local material treatment
- avoid over-contained cards and nested shells that reduce density without improving clarity

## Validation Rules

- for small UI-only tweaks, do not run tests by default
- instead, prompt the user to run the most relevant targeted validation command and report back
- prefer `pnpm test:storybook`, `pnpm check:stories`, or a focused `pnpm test <path>` over broad
  suites when suggesting UI validation
