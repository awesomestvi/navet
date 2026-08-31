# Navet UX

Read this file before changing dashboard layout, card behavior, section composition, settings,
dialogs, navigation, or visual hierarchy. When the work changes a shared visual or interaction
rule, also read the full
[`UI-GUIDELINES.md`](../../docs/design-system/UI-GUIDELINES.md). When the work changes how Navet
communicates visually or through cards, also use the canonical
[brand system](../../docs/branding/README.md) and
[product card grammar](../../docs/branding/CARD_GRAMMAR.md).

## Design From Evidence

Before writing JSX or styles:

1. Inspect the exact screen and the components that currently render it.
2. Name one primary Navet reference and, when useful, one supporting reference.
3. Inspect the nearest primitive or pattern and its Storybook story.
4. Write a compact intent note: information priority, primary action, density, responsive change,
   and the one visual detail that makes the surface recognizably part of Navet.
5. Decide whether the work reuses, extends, or intentionally replaces an existing recipe. A new
   recipe needs a concrete reason.

Reference order:

1. The same component family and its immediate neighbors on the target screen.
2. Home for dashboard outer spacing, section rhythm, summary-bar spacing, card-grid density, and
   responsive behavior.
3. The relevant shared primitive or pattern story.
4. UI-kit recipes and token stories.

Do not treat a marketing page, an isolated experimental story, or a generic design trend as a
dashboard reference.

Stable docs and Storybook imports come from `@navet/app/ui-kit/primitives`,
`@navet/app/ui-kit/patterns`, and `@navet/app/ui-kit/tokens`. Start review in the UI-kit inventory
and recipes, the relevant theme foundation, the matching primitive or pattern story, and the card
catalog or state matrix when card behavior is involved.

## Product Direction

Navet is an operational smart-home surface. It should be:

- glanceable: live state and exceptions are understood before decoration
- compact but calm: useful density with clear grouping, not crowded controls
- direct: the common household action is obvious and available without entering edit mode
- tactile: controls read as controls on touch screens without depending on hover
- recognizably Navet: rounded, theme-native surfaces; restrained accent; strong live-state
  hierarchy; and consistent card geometry

"Premium" is an outcome of alignment, restraint, typography, state clarity, and interaction
quality. It is not permission to add glass, gradients, large hero copy, decorative charts, or
empty space.

## Hierarchy And Composition

- Start with content and state: identity, current value, exception, primary action, then secondary
  detail and settings.
- Preserve the target screen's existing outer shell and spacing mode. Do not add a feature-local
  max-width, page padding, or centered container to a dashboard section.
- Match Home's responsive rhythm when creating or reshaping a dashboard section: compact mobile
  spacing, denser card grids, and increased section separation at larger breakpoints.
- Prefer one clear surface over a card inside a panel inside a section card.
- A section heading should organize content, not become a decorative hero.
- Keep compact cards single-purpose. Put configuration and secondary controls in the established
  dialog or sheet pattern.
- Use existing card sizes and make every supported size an intentional layout, not a clipped
  desktop composition.

## Interaction And Copy

- Use Navet's shared interaction scale for focusable controls: 36 px compact minimum, 40 px
  standard, and 42 px only when extra separation or emphasis is genuinely needed.
- Treat 42 px as the ceiling for ordinary icon and single-line controls; content-rich rows and
  gesture surfaces may be taller only when their interaction genuinely requires it.
- Do not rely on hover, color alone, or motion alone to reveal state or affordance.
- Keep focus-visible and reduced-motion behavior when extending shared controls.
- Use progressive disclosure for configuration; do not hide useful live state behind it.
- Use sentence case, short household language, and the existing translation system.
- Do not invent explanatory subtitles, status labels, badges, or calls to action merely to fill a
  composition. Every visible line must help the user understand state or act.
- Uppercase is an exception for established eyebrow tokens, external identifiers, and short
  technical codes; it is not a default heading style.

## Themes And Visual Treatment

- Preserve the theme model: `glass`, `dark`, `light`, `black`.
- Resolve surfaces, readable text, focus, controls, spacing, and motion through shared helpers
  before writing feature-local classes.
- Only `glass` uses frosted or translucent card treatments. `dark` and `black` remain dark-surface
  families; `light` remains a light-surface family.
- Layer accent through a shared tint, border, glow, icon, or text emphasis. Do not replace the
  current theme or lane surface with a one-off material recipe.
- Neighboring cards inherit the same surface family and geometry before expressing different
  semantic states.
- Do not introduce a new font, base type scale, palette, radius system, shadow language, or page
  shell unless the task explicitly redesigns that foundation.
- Use motion to explain state change or spatial continuity. Avoid ambient animation and expensive
  effects on always-visible or frequently updating surfaces.

## Architecture

- Shared UI consumes normalized Navet state and provider-neutral view models.
- Reuse current primitives from `packages/app/src/components/primitives/` and patterns from
  `packages/app/src/components/patterns/` before creating feature-local equivalents.
- Treat those app-owned paths as current authoring seams; do not move a component to `@navet/ui`
  unless provider-neutral extraction is part of the task.
- Keep provider payloads, service calls, and feature-specific state outside generic visual
  primitives.

## Review Before Handoff

Review the result against the named reference, not only against the request:

- normal, active, unavailable, loading, empty, and error states that the feature supports
- smallest and largest supported card sizes or viewport widths
- `glass`, `dark`, `light`, and `black`, including readable accent states
- touch, keyboard focus, reduced motion, and no-hover use
- realistic long names, translated copy, missing artwork, and missing optional data
- high and reduced effects quality when visual effects are involved

If a visual review surface is available, inspect it and correct visible hierarchy, overflow,
alignment, and theme mismatches before calling the work complete.

For small UI-only tweaks, do not run tests by default. Tell the user the most relevant focused
validation, usually `pnpm test:storybook`, `pnpm check:stories`, or `pnpm test <path>`. For broader
UI work, follow `docs/agents/commands.md` and use the smallest routeable validation that covers the
change.
