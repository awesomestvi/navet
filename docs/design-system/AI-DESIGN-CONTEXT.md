# Navet AI Design Context

Use this as the fast design packet before creating or changing dashboard UI. An agent should be
able to name the product references it used before implementation begins.

The full source of truth remains:

- [UI-GUIDELINES.md](UI-GUIDELINES.md)
- [README.md](README.md)
- [Navet brand system](../branding/README.md) for durable identity and
  [product card grammar](../branding/CARD_GRAMMAR.md) for how cards communicate
- Storybook under `packages/app/src/ui-kit/`, `packages/app/src/components/primitives/`,
  `packages/app/src/components/patterns/`, and feature card stories

## Product Feel

Navet should feel glanceable, compact but calm, direct, tactile, and recognizably Navet.

Build operational smart-home surfaces first. Avoid marketing-page composition, decorative hero
sections, generic SaaS cards, and oversized empty space in dashboard surfaces.

"Premium" describes the quality of alignment, state clarity, restraint, and interaction. It is
not a visual recipe.

## Reference-First Workflow

Before writing JSX or styles:

1. Inspect the target screen and its immediate neighbors.
2. Choose a primary reference: the same component family when it exists, otherwise Home for
   dashboard rhythm and responsive density.
3. Inspect the nearest primitive or pattern story and its token helpers.
4. State the intended information priority, primary action, responsive behavior, and one
   product-specific visual detail.
5. Reuse or extend the reference recipe. Introduce a new recipe only when the existing one cannot
   express the required behavior.

Home is the canonical dashboard reference for outer spacing, section rhythm, summary-bar spacing,
card-grid density, and responsive behavior. A more specific neighboring feature surface wins for
the component family it already establishes.

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
- Treat every supported card size as an intentional composition.

Dashboard sections:

- Preserve the shared dashboard shell and the active dashboard spacing mode.
- Do not add feature-local page padding, max-width containers, or centered content shells.
- Use section headings to organize live content, not as decorative heroes.
- Avoid card-inside-panel-inside-section nesting.

Settings and dialogs:

- Use shared modal, sheet, field, and dialog-section patterns.
- Keep touch targets suitable for tablet and kiosk use.
- Use progressive disclosure for configuration-heavy workflows.

Typography:

- Use sentence case for visible UI text.
- Avoid uppercase labels, buttons, headings, and metadata by default.
- Use weight, color, spacing, and layout hierarchy before letter spacing or uppercase.
- Do not introduce a new font or base type scale for a feature.
- Do not add filler copy to balance a layout.

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
- `Cards/Overview/Core State Matrix`
- `Cards/Overview/Extended State Matrix`

## Anti-Patterns

Avoid:

- Feature-local card shells when a shared primitive or pattern exists.
- Nested cards or over-contained section shells.
- One-off gradients that replace the current theme surface family.
- Heavy blur, layered effects, and always-running animation on frequently updating dashboard cards.
- Hover-only affordances.
- Provider-specific payload fields in shared UI.
- Raw Home Assistant service payloads as UI command models.
- Recreating a nearby Navet surface from memory instead of inspecting it.
- Using "premium," "modern," or "glass" as sufficient design direction.
- Feature-local page shells, max-widths, spacing systems, palettes, radii, or type scales.
- Validating only the default theme, ideal data, or one viewport.

## Handoff Checklist

Name the reference used, then review:

- supported states and realistic missing or long data
- smallest and largest size or viewport
- all four themes and accent readability
- touch, keyboard focus, reduced motion, and no-hover use
- reduced effects quality when effects are present
- visual hierarchy, overflow, alignment, and surface consistency in a rendered review surface

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
