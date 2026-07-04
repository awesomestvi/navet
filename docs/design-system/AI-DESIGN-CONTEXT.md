# Navet AI Design Context

Use this as the fast design packet before creating or changing dashboard UI.

The full source of truth remains:

- [UI-GUIDELINES.md](UI-GUIDELINES.md)
- [README.md](README.md)
- Storybook under `packages/app/src/ui-kit/`, `components/primitives/`, `components/patterns/`,
  and feature card stories

## Product Feel

Navet should feel premium, glanceable, dense, and wall-panel friendly.

Build operational smart-home surfaces first. Avoid marketing-page composition, decorative hero
sections, generic SaaS cards, and oversized empty space in dashboard surfaces.

## Theme Model

Supported themes are:

- `glass`
- `dark`
- `light`
- `black`

Rules:

- Resolve surfaces through shared theme helpers before writing feature-local theme branches.
- Keep `dark` and `black` as dark-surface card families.
- Use frosted or translucent glass-like treatments only for `glass`.
- Make accent-aware states by tinting the current surface with border, glow, overlay, or text.
- Do not replace a lane's surface family with a one-off gradient or material treatment.

## Shared Starting Points

Prefer these stable imports in stories and docs:

```ts
import { ... } from '@navet/app/ui-kit/primitives';
import { ... } from '@navet/app/ui-kit/patterns';
import { ... } from '@navet/app/ui-kit/tokens';
```

Current authoring locations:

- `packages/app/src/components/primitives/` for low-level reusable controls and surfaces.
- `packages/app/src/components/patterns/` for reusable compositions.
- `packages/app/src/components/shared/` for app-specific shared UI that is still coupled to the app.
- `packages/app/src/components/system/` for curated exports, not default authoring.
- `packages/ui/src/` for target provider-neutral shared UI extraction.

## Composition Defaults

Cards:

- Communicate device or widget identity immediately.
- Keep the main control path obvious.
- Degrade cleanly across supported card sizes.
- Do not duplicate the same action in multiple card regions.
- Move overflow controls into dialogs instead of crowding compact cards.

Settings and dialogs:

- Use shared modal, sheet, field, and dialog-section patterns.
- Keep touch targets suitable for tablet and kiosk use.
- Use progressive disclosure for configuration-heavy workflows.

Typography:

- Use sentence case for visible UI text.
- Avoid uppercase labels, buttons, headings, and metadata by default.
- Use weight, color, spacing, and layout hierarchy before letter spacing or uppercase.

## Canonical Storybook Surfaces

Start in these stories before inventing a new UI recipe:

- `Concepts/UI Kit Start Here`
- `Concepts/UI Kit Inventory`
- `Concepts/UI Kit Recipes`
- `Theme/Colors`
- `Theme/Typography`
- `Theme/Spacing`
- `Theme/Motion`
- `Components/Primitives/Cards/BaseCard`
- `Components/Primitives/CardShell`
- `Components/Patterns/*`
- `Cards/Overview/Catalog`
- `Cards/Overview/State Matrix`

## Anti-Patterns

Avoid:

- Feature-local card shells when a shared primitive or pattern exists.
- Nested cards or over-contained section shells.
- One-off gradients that replace the current theme surface family.
- Heavy blur, layered effects, and always-running animation on frequently updating dashboard cards.
- Hover-only affordances.
- Provider-specific payload fields in shared UI.
- Raw Home Assistant service payloads as UI command models.

## Validation

Use focused checks:

```bash
pnpm validate -- --scope ui
pnpm validate -- --scope dashboard
pnpm check:stories
pnpm check:ui-kit
```

For broad visual regression, use Storybook validation:

```bash
pnpm test:storybook
```
