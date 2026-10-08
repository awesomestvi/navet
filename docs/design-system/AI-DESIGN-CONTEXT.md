# AI design discovery

Role: discovery reference. Follow the [UX task guide](../../ai/skills/navet-ux.md) for ordinary
UI work. Product principles and architecture have the authority defined in root `AGENTS.md`;
[UI guidelines](UI-GUIDELINES.md) own implementation rules. Storybook and code supply evidence.

## Select and inspect

1. Find the closest same-family surface, canonical imports and actual Storybook IDs through the
   [registry](REGISTRY.md). Inspect catalog level, owner, review status and executable example.
2. Inspect current props, slots, sizes, states, theme helpers and required context with
   `pnpm agent:components <name>`. Without a query it writes `.cache/agent-design/components.json`.
3. Select the relevant [composition recipe](AGENT-COMPOSITION-RECIPES.md), then follow the UX
   guide's intent note, rendered comparison and approval rules. Unsupported compositions record
   a coverage gap. Draft/pending examples require same-family rendered review; only
   maintainer-approved product compositions establish accepted guidance.

The generated catalog covers foundations, primitive/pattern entrypoints and local exports imported
by stories, including callable namespace members and object-union props. Regenerate after source
changes; its fingerprint identifies inspected contracts. Export presence proves neither maturity,
accessibility nor rendered quality.

## Source and story entrypoints

Use `@navet/app/ui-kit/primitives`, `@navet/app/ui-kit/patterns` and `@navet/app/ui-kit/tokens`
for stable docs/story imports. [Shared UI ownership](README.md#current-shared-ui-layers) distinguishes
current app-owned authoring from the target `@navet/ui` boundary.

Discover current IDs from source rather than deriving them from these navigation titles:

- `Concepts/UI Kit Start Here`, `Concepts/UI Kit Inventory`, `Concepts/UI Kit Recipes`
- `Theme/Colors`, `Theme/Typography`, `Theme/Spacing`, `Theme/Motion`
- `Components/Primitives/Cards/BaseCard`, `Components/Primitives/CardShell`, `Components/Patterns/*`
- `Cards/Overview/Catalog`, `Cards/Overview/Core State Matrix`, `Cards/Overview/Extended State Matrix`

## Evidence limits

`pnpm check:ui-kit` checks shared feature imports, known duplicated modal shells, copied card
surfaces and hardcoded foundations in supported static classes/inline styles. Existing occurrences
are tracked separately; new violations fail. It does not prove layout, keyboard behavior, themes
or fidelity. Use the [UX evidence guidance](../../ai/skills/navet-ux.md) for affected
surfaces and direct consumers, and the [command guide](../agents/commands.md) for focused checks.

Read the [brand system](../branding/README.md) and [card grammar](../branding/CARD_GRAMMAR.md)
only when changing their foundations. New visual patterns require explicit maintainer approval.
