# Navet composition registry

The registry distributes editable React compositions for the Navet app. Templates import canonical
Navet components and use existing app authoring seams. Installation adds template files without
copying primitives, changing themes, or installing runtime dependencies.

## Discover and inspect

Before composing UI:

1. Discover a recipe by family and intended behavior through shadcn MCP or **Concepts / UI Kit Recipes**.
2. Inspect the template, required context, supported states, and current source-generated contracts.
3. Open its executable example and exact component reference. Review the interaction and responsive behavior.
4. Adapt caller-owned translated labels, normalized data and callbacks. Keep provider routing,
   capability decisions, validation rules and persistence in the consuming feature.

The [manifest](../../packages/app/src/ui-kit/registry/recipes.json) declares all templates and their
exact template, example and reference exports. Links resolve against Storybook's actual index;
source-file presence or a guessed story slug does not establish a valid reference.

| Family | Recipes |
| --- | --- |
| Dialog | `controls-first-dialog`, `settings-dialog` |
| Sheet | `detail-sheet` |
| Settings | `settings-field`, `settings-section` |
| Selection | `searchable-selection`, `checkbox-list` |
| Dashboard | `dashboard-section`, `dashboard-grouping` |
| Card | `empty-card`, `compact-device-card`, `metric-action-row` |
| Feedback | `status-feedback` |
| Navigation | `tabs`, `navigation-workspace` |
| Data | `sortable-table` |

Each payload includes context, states, review criteria, component contracts and template source.
`settings-dialog` uses the `BaseCardDialog` modal variant. Its caller receives `dismiss` requests
from the shell and `cancel` requests from the footer, decides whether to close, and owns dirty-edit
confirmation, pending saves and failed-save recovery. Save and cancel remain footer actions.
Attach `returnFocusRef` to a connected launch control. Focus returns after accepted closure;
choose an explicit feature fallback if the launcher may disappear.

`searchable-selection` receives already filtered, capability-aware options. It owns opening,
keyboard highlighting and dismissal, while the feature owns query/filtering and selected data.
`dashboard-section` is a standard `SectionCard` composition. `status-feedback` is inline operation
feedback. Hero sections, dashboard attention summaries and richer device-family controls follow the
[reference-first workflow](AGENT-COMPOSITION-RECIPES.md); identify the coverage gap in the work brief.

## Local development

Run from the Navet checkout whose source contracts you want to inspect:

```bash
pnpm install --frozen-lockfile
pnpm registry:dev
```

The coordinated command starts Storybook on `6006` and the registry on `7331`. It regenerates
contracts, story links and payloads after relevant source/configuration changes. Rebuilds publish a
complete replacement directory, removing stale items. Changed, failed or stopped builds are
unavailable until a successful rebuild; they cannot masquerade as current registry content.
Ctrl+C or SIGTERM shuts down both child process groups. Occupied ports fail clearly. For a second
review server, explicitly select `NAVET_STORYBOOK_PORT`; changing `NAVET_REGISTRY_PORT` also requires
an explicit matching client registry URL.

The repository's `components.json` retains local resolution:

```json
{ "registries": { "@navet": "http://127.0.0.1:7331/r/{name}.json" } }
```

```bash
pnpm dlx shadcn@4.21.0 list @navet
pnpm dlx shadcn@4.21.0 search @navet --query 'keyboard selection'
pnpm dlx shadcn@4.21.0 view @navet/settings-dialog
pnpm dlx shadcn@4.21.0 add @navet/settings-dialog --dry-run
```

Run installation in a disposable Navet checkout before adapting a new template. The target is
`packages/app/src/components/recipes/<name>.tsx`, resolved through Navet's existing aliases.
Compile the installed template and exercise its reference-equivalent interactions. Preserve
`package.json`, the lockfile and theme files. External-project portability is outside this registry.

`pnpm registry:build` generates `.cache/ui-registry/r`; `pnpm registry:serve` serves a one-shot build.
`pnpm storybook` prepares payloads for a standalone development session; use `registry:dev` for
coordinated live regeneration. The browser reports endpoint failures and exposes source, contracts,
revision and example links only when payload coverage matches its manifest.

## Codex MCP

Keep client configuration in the user's Codex configuration, outside Git. Add the pinned shadcn
server with the Navet working directory while retaining the existing Storybook connection:

```toml
[mcp_servers.shadcn]
command = "pnpm"
args = ["dlx", "shadcn@4.21.0", "mcp", "--cwd", "/absolute/path/to/navet"]
cwd = "/absolute/path/to/navet"
```

Start the matching local registry before discovery. Use shadcn registry search/view tools to
discover recipes. In pinned 4.21.0, `view_items_in_registries` returns a summary; use
`get_item_examples_from_registries` with the exact recipe name to inspect template source.
Inspect generated `meta.contracts`, context and exact story links through the registry JSON or
Storybook recipe browser, then review rendered examples through Storybook. Reload the Codex
client or start a fresh session after changing MCP configuration; configuration presence alone does
not establish a connection in an already-running session. Keep `4.21.0` until CLI/MCP discovery,
view, dry-run and disposable installation compatibility have been exercised with a proposed pin.

## Matching hosted Storybook

Every Storybook build publishes `/r/registry.json` and `/r/<name>.json` alongside its rendered
examples. Publication validates links against the built `index.json`. Metadata records commit,
dirty status, source/contract/template/story/composition fingerprints, and a fingerprint of the
built Storybook index and iframe entry document (including its content-hashed asset references).
Local dirty builds are explicitly identified. Hosted completion requires a clean exact PR revision.

Use the immutable Storybook deployment URL from the current-head Cloudflare check. Do not substitute
the production domain or an ancestor deployment accepted by the general Pages gate.

```bash
pnpm registry:preview https://EXACT-DEPLOYMENT.navet-app-storybook.pages.dev EXPECTED_FULL_SHA
```

The verifier rejects revision, source, rendered-entry, indexed-story and item/index mismatches and
prints CLI commands bound to that URL. It compares current local contracts to hosted content;
commit current source before running it. Test hosted list/search/view/dry-run against the printed
URL. Hosted verification never changes the checked-in local `@navet` URL or falls back to another
revision. A passing general CI or Pages gate alone is insufficient evidence.

## Structural and rendered checks

```bash
pnpm test:registry
pnpm check:ui-kit
pnpm check:stories
pnpm typecheck
pnpm test:storybook packages/app/src/ui-kit/registry/registry.stories.tsx packages/app/src/ui-kit/recipes.stories.tsx --run
pnpm storybook:build
```

AST/symbol checks validate manifest coverage, permitted named imports and aliases, component
exports, template exports and exact example/reference exports. Official shadcn JSON Schema
snapshots validate payloads offline; update them with pinned-CLI compatibility evidence.

Composition guards cover application sources, templates and stories. They detect known static
copied shells, nested `SheetSurfaceHeader` usage and missing explicit recipe close-focus handlers.
Canonical shell implementation modules own their shell classes. Dynamic CSS equivalence and
handler behavior require separate review. The occurrence-specific baseline records unrelated
existing defects; new occurrences fail and removed entries must be deleted. Never baseline recipes
or their direct examples to make a new composition pass.

These checks do not establish visual acceptance. Exercise relevant supported states and keyboard
interactions for every recipe. Review a recorded representative matrix spanning all four themes,
card sizes, phone, tablet portrait/landscape, desktop, long labels and reduced motion. Review
risk-specific combinations exhaustively. Maintainer visual acceptance, merge and production release
remain separate delivery gates.
