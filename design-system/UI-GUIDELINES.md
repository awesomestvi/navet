# Navet UI Guidelines

This document describes the visual and interaction rules for Navet's shared UI.

Use it together with:

- [README.md](README.md)
- [FEATURES.md](FEATURES.md)
- [STORYBOOK_FOUNDATION.md](STORYBOOK_FOUNDATION.md)

## Design Goals

Navet's UI should feel:

- clear enough for glanceable wall-dashboard use
- dense enough to fit real smart-home information
- expressive without relying on expensive visual effects everywhere
- consistent across dashboard cards, settings dialogs, and section views

## Foundations

Shared first-layer foundations live in
[`src/app/components/system/tokens/foundations.ts`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/system/tokens/foundations.ts).

Navet is platform-neutral. iOS `pt`, Android `dp`, CSS px, and desktop logical px are
implementation units, not the design-system foundation.

Prefer these shared values for:

- spacing
- typography roles
- border radii
- icon sizing
- stroke widths
- focus treatment

Do not introduce one-off values when an existing foundation token covers the need.

## Theme Modes

Navet supports four themes:

| Theme | Character |
|---|---|
| `glass` | layered frosted surfaces and higher-depth treatment |
| `dark` | restrained dark surfaces with muted gradients |
| `light` | brighter surfaces with softer borders and shadow |
| `black` | very dark, high-contrast surfaces |

Guidelines:

- resolve shared surfaces through theme helpers before writing inline theme branches
- keep `black` as its own treatment, not just a darker `dark`
- use readable-text token logic for tinted or accent-heavy surfaces

## Color Rules

### Semantic color intent

- lights: warm or device-color-driven active states
- climate: mode-based temperature colors
- media: artwork- or media-accent-aware treatment
- locks: clear locked/unlocked contrast
- sensors and power: status-driven accents, not decorative tinting

### Accent system

Navet supports built-in accent choices plus a custom accent.

Accent color affects:

- selected navigation and pills
- active card states
- sliders and progress surfaces
- focused/selected controls
- appearance previews and related color pickers

Keep accent logic centralized. When adding new accent-sensitive UI, reuse existing token helpers or
shared theme utilities rather than inventing new accent class combinations inline.

## Typography

Typography should optimize for quick scanning first.

Rules:

- keep the current role-based token model instead of introducing platform-specific type scales
- keep `14px` as the minimum body text floor for readable product UI
- titles should be concise and stable across card sizes
- subtitles and eyebrows should provide context without competing with the main title
- compact cards should prefer eyebrow-first or tightly structured title blocks when space is limited
- large cards can add more descriptive secondary text, but should still avoid verbose copy

Shared header/title structures should reuse the shared title block and card-header primitives when
possible.

## Spacing and Density

Navet uses a 4px-based spacing rhythm.

Typical spacing steps:

- `4px`
- `8px`
- `12px`
- `16px`
- `20px`
- `24px`
- `32px`

Guidelines:

- use semantic spacing tokens as the authoring layer rather than raw platform units
- use tighter spacing in compact cards only when legibility is preserved
- avoid deep nesting with stacked gaps that create accidental whitespace
- keep settings dialogs roomy enough for touch targets and readability

### Density policy

Navet uses three density tiers from the shared token layer:

- `compact`: dense desktop or keyboard/mouse-heavy surfaces
- `comfortable`: default product density for mixed-input tablets, laptops, and general dashboard use
- `touch`: touch-first wall panels, phones, kiosks, and coarse-pointer surfaces

Target sizes:

- `compact`: `36px`
- `comfortable`: `44px`
- `touch`: `48px`

Rules:

- default to `comfortable`
- use `touch` for coarse-pointer contexts
- do not default to `compact` on touch-first or mixed-input screens
- touch inputs may exceed `48px` when readability or editing comfort benefits from it

### Width vs input capability

Width and input capability are separate adaptation axes.

- width controls layout, grid structure, and how much content can be visible at once
- input capability controls target size, spacing comfort, and reliance on hover

Content policy:

- narrow widths: stack content and reduce simultaneous controls
- medium widths: balanced overview plus controls
- wide widths: denser monitoring, editing, and multi-panel layouts

## Border Radius

Use radius consistently to communicate hierarchy:

- major cards and shells: large rounded corners
- controls and pills: rounded-full or clearly pill-like treatment
- inputs and smaller surfaces: medium-to-large rounded corners, depending on context

Do not mix multiple unrelated radius languages in the same component.

## Icon Rules

Use `lucide-react` icons unless an established exception already exists.

Guidelines:

- icons belong in the card header's leading slot for most entity cards
- use shared icon-container and icon-pill patterns where they already exist
- preserve consistent icon sizing across card-size families
- set `flex-shrink-0` on icon containers in dense layouts

Compact icon sizing should stay aligned with the shared foundations and card-header primitives.

## Card Layout Rules

### Shared card expectations

Every card should:

- communicate the device or widget identity immediately
- avoid overflow in all supported sizes
- degrade gracefully in compact sizes
- keep primary actions obvious
- keep primary actions visible without hover in touch-first contexts
- avoid repeating the same control in multiple places

### Card sizes

Supported sizes:

- `tiny`
- `extra-small`
- `small`
- `medium`
- `medium-vertical`
- `large`
- `extra-large`

Use the shared card-size registry. Do not hardcode parallel pixel maps for preview or overlay
behavior.

Layout should scale from shared grid helpers and card-size registries, not platform-specific widget
dimensions.

### Compact cards

Compact cards are the easiest place for UI drift and accidental clutter.

Rules:

- prefer shared compact shells and title patterns
- show only the one or two controls that justify the size
- keep dense cards mechanically simple
- if a control does not fit clearly, move it to the dialog/settings surface instead

## Dialog and form surfaces

Settings and entity dialogs should reuse shared structure before creating new wrappers.

Expected building blocks include:

- `DialogShell`
- shared card-dialog header
- shared section rows/sections
- shared tabs and choice pills
- shared footer/done actions

Forms should:

- keep section labels and helper text aligned
- avoid mixed control densities in the same section
- maintain keyboard and touch accessibility
- derive control sizing from shared control tokens instead of bespoke per-component target sizes

## Motion and transitions

Motion should support state comprehension, not decorate the interface.

Guidelines:

- short interactions: use restrained durations
- state changes: use smoother, slightly longer transitions where the change benefits from it
- avoid layering multiple expensive effects such as blur, glow, and scale on the same interaction
- on lower-power paths, prefer reducing effects instead of keeping rich effects with slower timing
- when density increases, visual complexity should usually decrease rather than increase

## Performance rules

Navet must remain usable on low-power tablets and wall panels.

Be careful with:

- large backdrop blurs
- stacked translucent overlays
- heavy box shadows
- complex animated gradients
- deeply nested layout wrappers
- large artwork surfaces with extra visual processing

If a more visually ambitious treatment meaningfully increases blur, overdraw, or animation cost,
document the tradeoff and provide a reduced-cost fallback.

## Accessibility

Minimum expectations:

- keep touch targets aligned with density guidance for the current input context
- maintain readable contrast in every theme
- preserve focus visibility for keyboard navigation
- ensure icon-only actions have accessible names
- avoid state communication that relies only on color

## Storybook review expectations

When documenting shared UI in Storybook:

- verify theme parity across `glass`, `dark`, `light`, and `black`
- check compact-size behavior for card primitives and patterns
- validate readable text on tinted and accent-heavy surfaces
- keep story titles aligned with the current taxonomy

## Anti-patterns

Avoid:

- importing iOS widget sizes or Apple points into shared Navet layout decisions
- raw inline theme branches when shared surface helpers exist
- new low-level shared UI inside `shared/` by default
- hardcoded duplicate card-size maps
- decorative motion that obscures state or hurts performance
- compact cards that duplicate controls across rows
- feature-specific dialog shells that bypass shared settings patterns without a strong reason

Last updated: April 28, 2026
