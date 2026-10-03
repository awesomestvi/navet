# Storybook MCP pilot

The opt-in local MCP server helps agents discover Navet story IDs, obtain preview links and run focused component and accessibility tests.
It complements the generated component catalog and source recipes. Its documentation extraction
currently has gaps; the presence of a component in discovery does not establish a complete API.

## Start and connect

From the checkout root, run:

```bash
NAVET_STORYBOOK_MCP=1 STORYBOOK=1 STORYBOOK_DISABLE_TELEMETRY=1 pnpm --filter @navet/storybook exec storybook dev --ci --host 127.0.0.1 --port 6017 -c ./.storybook
```

Connect an HTTP MCP client to `http://127.0.0.1:6017/mcp`. Keep the development server on loopback
and use synthetic Storybook data. The addon and component manifest are enabled only when
`NAVET_STORYBOOK_MCP=1`; ordinary Storybook runs and builds retain their existing configuration.

Navet pins the official addon to 0.7.0, compatible with the installed Storybook 10.5.10. The
schema converter is pinned within its supported dependency range to match the addon's Valibot
version. Discover tools and their schemas from the running server: the current names differ
from the latest [Storybook MCP documentation](https://storybook.js.org/docs/ai/mcp/overview).

## Connect a Codex client

Start the loopback server above, then register it:

```bash
codex mcp add navet-storybook --url http://127.0.0.1:6017/mcp
codex mcp get navet-storybook --json
```

These commands save and inspect the connection configuration. Load the connection in a new
Codex session; a saved entry alone does not prove live discovery. Confirm that the client exposes
Navet's documentation, preview and focused testing tools before using them. The server requires
no OAuth login. Its process must remain running for calls to succeed.

Codex also supports a trusted project's `.codex/config.toml` when a project-scoped connection is
preferred:

```toml
[mcp_servers.navet-storybook]
url = "http://127.0.0.1:6017/mcp"
```

Use one configuration location for the connection. The native Codex app-server pilot successfully
initialized this HTTP endpoint and discovered all eight tools and the preview-app resource without
starting a model or delivery task. OAuth status discovery returned unknown, and session cleanup
reported an unsupported DELETE response; these did not prevent tool inventory. Actual tool calls in this delivery session verified live discovery, documentation, changed-story
selection, preview resolution and focused tests. Broader task evaluation needs its own evidence.

Remove an unwanted global registration with `codex mcp remove navet-storybook`. Configuration
behavior is documented in the [official Codex MCP guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Use the available tools

1. Call `list-all-documentation` with `withStoryIds: true` to discover component and story IDs.
2. Call `get-documentation` with a returned component ID. Check whether actual props and usage
   examples are present. Resolve incomplete or conflicting output through the source-derived
   catalog and the component's current source and story.
3. Use `get-documentation-for-story` when a particular variant needs more context.
4. Call `preview-stories` with discovered story IDs and inspect the resulting rendered previews.
5. Use `get-stories-by-component` for direct and transitive consumers of a changed shared piece.
   Its distance limit may omit consumers; inspect the returned clipping information.

The pilot enables documentation, development and testing tools. It adds the existing Vitest addon
only when the MCP flag is enabled. Call `run-story-tests` with discovered IDs for focused feedback:

```json
{
  "stories": [{ "storyId": "components-patterns-form-field--error-state" }],
  "a11y": true
}
```

Inspect the returned passing/failing stories and accessibility reports. Run the applicable Navet
validation commands as defined by the repository guide. A preview URL proves that the story
resolves; test results apply to the selected stories, their assertions and tested rendering state.

## Observed extraction limits

The pilot discovered the real sheet, form-field and BaseCardDialog story IDs. Sheet documentation
returned source-matching props including `isOpen`, `onOpenChange`, `title` and `responsive`.
Form-field documentation returned only a heading and Stories section. BaseCardDialog returned
story names and wrapper snippets without its discriminated props. Generated snippets may show
`@navet/app` imports and local wrapper components; select the stable UI-kit entrypoint and read
the [agent composition recipes](AGENT-COMPOSITION-RECIPES.md) before using them as implementation examples.

The discovered form error-state preview displayed its validation message and an input with
`aria-invalid=true`. The vacuum unavailable preview displayed its unavailable state. The sheet
preview opened at 390 × 844; at desktop width the mobile sheet remains hidden. The focused MCP test tool also returned passing
results for these three story IDs with accessibility enabled. Its Vitest runner reported four tests passed and fourteen skipped across
three story files. The default sheet test uses its default rendering state; phone interaction,
additional themes and the full product journey still need their own coverage. These checks verify
three preview and test targets, not a product-wide UX audit.

CardEmptyState's story metadata identifies the real shared component; the card frame belongs in a
Storybook decorator. MCP examples expose the required title and description and the actual
`actionLabel`/`onAction` contract. Action and no-action stories verify pointer/keyboard callback delivery and absence
of an action. Five focused stories pass through the native MCP test tool with accessibility enabled.
Small and large/no-action previews were inspected at 390 × 844 across all four themes; light-theme
text, action count and control geometry match their baseline. This is bounded Storybook evidence,
not provider delivery or a complete responsive product audit.

Generated CardEmptyState snippets still omit the icon and test-helper imports referenced in args.
They describe component usage but are not self-contained compilable examples. Use the source story
or compiled composition recipes for those dependencies. Changed-story discovery also reports the
modified story file as unreachable while listing its five modified story IDs; explicit focused
selection and rendered inspection are required when its coverage report contradicts itself.

## Composition discovery limits

Use MCP for story selection, then use the source-derived catalog and source story to assemble
complete compositions. These targets have different extraction limits:

| Composition | MCP API and example coverage | Source fallback |
| --- | --- | --- |
| Navigation workspace | Story IDs resolve, but documentation omits member APIs and the default example contains only `NavigationWorkspace.Item`. | Query `pnpm agent:components NavigationWorkspace.ScrollArea` and inspect the full workspace story for frame, sidebar, content and scroll-area composition. |
| Card action row | Props include required `theme`, size and overflow items. Generated size examples omit `theme` and action fixtures. | Supply the source-backed required props and read the action-row story for actual overflow actions. |
| Summary bar | Props include items, navigation, labeling and single-row behavior. Generated examples reference `items` without declaring the fixture. | Read the summary source story for item types, fixture definitions and wrapper context. |

Focused MCP tests with accessibility enabled pass for navigation default, card-action medium and
summary default: three tests pass and eleven other stories are skipped. Preview links resolve
for all three; link resolution is not rendered inspection. These selected tests do not establish
keyboard focus containment in the card action dock, responsive overflow across themes, or
complete summary navigation behavior. The mobile-grouped navigation story separately passes its
four-row equal-height and two-separator assertions with accessibility enabled (one test passes,
one story is skipped). This verifies the grouped composition in the test browser; it does not
establish a phone viewport or a theme matrix. An agent must include those interaction and state checks
when they form part of the accepted scope.

Keep filesystem access as an operational fallback. Current MCP extraction does not establish
the design-system discovery exit gate. Broader component coverage, complete examples and
comparison on representative delivery tasks remain evaluation work.
