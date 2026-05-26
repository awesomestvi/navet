# UI And Theming

This file defines shared UI placement, theming constraints, and visual-performance rules for Navet.

## Shared UI Placement

- Before building any new UI element, scan `src/app/components/primitives/` first.
- Reuse existing primitives, patterns, and shared shells instead of re-implementing them inline.
- New shared cross-feature UI belongs in `src/app/components/primitives/` or `src/app/components/patterns/`.
- `src/app/components/system/` is the curated public export surface, not the authoring location for new components.
- `src/app/components/shared/` is for app-specific shared UI and compatibility shims; do not default new primitives there.

## Theming Rules

- Use `src/app/components/shared/theme/theme-surface-tokens.ts` for shared surface decisions.
- Do not add `theme === 'light' ? ... : ...` branches inline when a shared surface token already covers the case.
- Keep local theme branches only for truly feature-specific styling such as domain accents or status colors.
- Tailwind CSS 4 only. Do not use inline style objects except for dynamic numeric values such as `style={{ width: `${pct}%` }}`.
- Glass aesthetic defaults: `backdrop-blur-xl`, `bg-white/5-10`, `border border-white/10-20`.
- Supported themes are `glass`, `dark`, `light`, and `black`.
- Themes are applied via `data-theme` on `<html>`.
- Persisted legacy `contrast` values normalize to `black`.

## Visual Performance Rules

- Keep DOM structure lean and avoid deep nesting.
- Be careful with blur, animation, shadow, and heavy layered effects on weaker hardware.
- Flag any tradeoff where visual richness may hurt performance on low-power devices.

## Related Guidance

- General coding and reuse rules live in [coding-standards.md](coding-standards.md).
- Storybook review and story ownership rules live in [storybook.md](storybook.md).
