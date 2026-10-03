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

## Source-Derived Component Discovery

Run `pnpm agent:components SheetSurface` to inspect matching exports, import paths, typed
parameters, props, source locations, and associated story files. Run `pnpm agent:components`
without a query to generate `.cache/agent-design/components.json`. Every invocation regenerates
metadata from current source and includes a fingerprint of its local TypeScript sources, effective compiler options, catalog entry points,
and story inputs.

For union-based props, `properties` contains the fields shared across alternatives; `variants`
preserves each alternative's own fields, types and required/optional discriminator. Select one
valid contract before composing a component. Props from different alternatives are not a single
combined API.

Export presence does not establish component maturity. The [maturity inventory](component-maturity.json)
classifies inspected canonical components and records rationale and source/story evidence. The catalog
matches each annotation to the exact export, import surface and source; stale identities or missing
evidence stop generation. Types and token/helper values remain `unclassified`; component maturity applies to the inspected
component and namespace contracts. `maturityFingerprint` covers the
inventory and evidence separately from the TypeScript `sourceFingerprint`.

`app-coupled` identifies components that require app context or helpers. Reuse them inside Navet's
app through their listed import surface; they are not standalone `@navet/ui` contracts. `stable`
is reserved for an explicitly curated mature contract, and `experimental` identifies an evolving
contract. The inventory covers the current catalog's component and namespace contracts, including
card/sheet foundations, form controls, typography, status and action
primitives, navigation workspace parts, dialog compositions and tabs. Read namespace entries as
composition objects, not JSX components. Layout wrappers can have narrower contracts than their
surrounding app-coupled composition. No contract is classified stable. Read each rationale for context requirements, labeling responsibilities and
current API limits. A classification is guidance, not proof of accessibility, complete state
coverage or public SemVer guarantees.
Story associations identify imports in story files, not proof that every listed story exercises
that export. The catalog complements source and rendered review; it does not validate UI quality.

## Local Storybook Discovery

Use the opt-in [Storybook MCP pilot](STORYBOOK-MCP.md) to discover actual story IDs and preview
links. Inspect the returned API and examples for completeness; use the generated catalog and
source recipes when extraction is incomplete. Rendered inspection remains required.

Use the [agent composition recipes](AGENT-COMPOSITION-RECIPES.md) to choose card controls, overflow
navigation, sheets, settings fields, summaries and state compositions. The examples name actual
props and source stories; inspect current contracts before adapting them.

## Source-Derived Token Exchange

Run `pnpm agent:tokens` before reading `.cache/agent-design/tokens.tokens.json`. The command
regenerates a [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/) subset from the
public TypeScript token exports and the app stylesheet without evaluating UI modules. Check that
generation succeeded;
a cached file from a failed generation is not current evidence. Use `pnpm agent:tokens controlSizePx`
for a case-insensitive path search. It regenerates the same full export and prints only matching
tokens and omissions, retaining values, units, source locations and the source fingerprint. An empty
result means the query found no source path; inspect the catalog or token entry before assuming
the design system lacks the needed recipe.

The export includes finite numeric constants with explicit `Px` or `Ms` units, the `durationsMs`
group, and unitless `fontScale` values. Imported constant references resolve through TypeScript.
Supported spacing, inset, radius, height and width utility constants are resolved through the
installed Tailwind compiler and Navet's actual imported CSS. Equal height/width pairs can supply
one size dimension. The export preserves `rem` and `px`; it never assumes a browser root font size
or a four-pixel spacing scale. Conditional, conflicting, unsupported or mixed-value utilities
remain omissions. Each resolved utility retains its original classes and affected CSS properties.

Each record carries its TypeScript source location. The root extension carries separate TypeScript
and stylesheet fingerprints, CSS import provenance, compiler version and an omission inventory.
Path searches include both fingerprints when CSS resolution is present. A unit-bearing value that
cannot be resolved to a numeric constant stops generation rather than producing an invented value.

This is discovery metadata, not a separately editable token source. Colors, typography, contextual
spacing, unequal/composite class combinations, dynamic theme helpers, density selection and
reduced-motion policy still need their source recipes and rendered stories. An omission means inspect that recipe; it does not authorize
replacing it with a numeric approximation. Imported stylesheets must belong to the checkout or
the installed Tailwind package; stylesheet JavaScript plugins are not evaluated. Select components
with the catalog, read their recipe,
resolve supported values from this export, and verify the resulting composition in Storybook.

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
- Use the shared 36 px compact minimum and 40 px standard control size; reserve 42 px for
  exceptional touch-forward controls that genuinely need extra separation or emphasis.
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

The UI-kit boundary check rejects the known centered-modal and bottom-sheet shell signatures,
including reordered utility classes and multiline literals. Existing migration exceptions remain
explicit in the checker. It parses static string and template values in class attributes, class properties, and recognized
class-building calls, interpreting escapes. Plain text fixtures, comments, and prose are outside
the class check. It does not establish equivalent computed styles, follow classes assembled
across expressions, or replace rendered review. Structural layout markup remains
valid when it does not reproduce a complete forbidden signature.

Shared UI imports are checked through the existing package-import tokenizer. Alias and relative
paths are normalized before checking feature ownership; static/type imports, re-exports, literal
dynamic imports and literal require calls are covered. Comments and quoted examples are excluded.
Computed runtime names and transitive dependencies require separate review. This supplements the
provider/package boundary checks rather than replacing their contracts.

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
