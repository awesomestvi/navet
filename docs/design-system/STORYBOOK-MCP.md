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

Use one configuration location for the connection. Inspect the running server's tool inventory
and verify actual documentation, preview and focused-test calls. OAuth status discovery and
session cleanup metadata do not establish whether these operations work. Record connection and
task-evaluation results with the source revision in the authorized evidence store.

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

Inspect form error associations and unavailable states in their rendered previews. A mobile sheet
is hidden at unsupported desktop widths; select its supported phone viewport before reviewing
open/close behavior. Focused tests apply to their selected assertions and rendering state.
Phone interaction, themes and complete product journeys need their own coverage. Record actual
results and skipped stories separately from this lasting usage guidance.

CardEmptyState's story metadata identifies the real shared component; the card frame belongs in a
Storybook decorator. MCP examples expose the required title and description and the actual
`actionLabel`/`onAction` contract. Use action and no-action stories to check pointer/keyboard
callback delivery and the absence of an action. Inspect supported sizes in all four themes,
including light-theme text, action count and control geometry. Isolated Storybook checks do not
establish provider delivery or a complete responsive product audit.

Generated CardEmptyState snippets still omit the icon and test-helper imports referenced in args.
They describe component usage but are not self-contained compilable examples. Use the source story
or compiled composition recipes for those dependencies. Changed-story discovery also reports the
modified story file as unreachable while listing modified story IDs; explicit focused
selection and rendered inspection are required when its coverage report contradicts itself.

## Composition discovery limits

Use MCP for story selection, then use the source-derived catalog and source story to assemble
complete compositions. These targets have different extraction limits:

| Composition | MCP API and example coverage | Source fallback |
| --- | --- | --- |
| Navigation workspace | Story IDs resolve, but documentation omits member APIs and the default example contains only `NavigationWorkspace.Item`. | Query `pnpm agent:components NavigationWorkspace.ScrollArea` and inspect the full workspace story for frame, sidebar, content and scroll-area composition. |
| Card action row | Props include required `theme`, size and overflow items. Generated size examples omit `theme` and action fixtures. | Supply the source-backed required props and read the action-row story for actual overflow actions. |
| Summary bar | Props include items, navigation, labeling and single-row behavior. Generated examples reference `items` without declaring the fixture. | Read the summary source story for item types, fixture definitions and wrapper context. |

Select navigation, card-action and summary stories through live discovery and run their focused
tests with accessibility enabled. Inspect rendered keyboard focus containment in the action dock,
responsive overflow across themes and summary navigation separately. The grouped navigation
story's equal-height rows and separators need inspection at the actual supported phone viewport;
a default test-browser rendering does not establish a phone or theme matrix. Include relevant
interaction and state checks in the accepted scope and retain run-specific evidence privately.

Keep filesystem access as an operational fallback. Current MCP extraction does not establish
the design-system discovery exit gate. Broader component coverage, complete examples and
comparison on representative delivery tasks remain evaluation work.
