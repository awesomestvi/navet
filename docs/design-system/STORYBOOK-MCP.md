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

Use one configuration location for the connection. Verify live tool discovery after loading it in
Codex. A saved connection entry or a successful server initialization does not establish that
preview and test calls work. Keep the server running and check the actual tool result before
using it as evidence.

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

## Extraction and validation limits

Documentation extraction can return only a heading, story names, or wrapper snippets rather than
the component's full API. This affects form-field and BaseCardDialog discovery. Inspect the
source-derived catalog for discriminated props, required fields, and valid alternatives.

Generated snippets can use broad `@navet/app` imports, local wrappers, or args that reference icons
and test helpers without their imports. Select the stable UI-kit entrypoint and use the source
story or [composition recipes](AGENT-COMPOSITION-RECIPES.md) for complete dependencies. Verify an
example against the current TypeScript contract before adapting it.

When changed-story discovery reports a file as unreachable while also returning its modified story
IDs, select those IDs explicitly and inspect their consumers. A clipped or contradictory coverage
report cannot establish complete affected-story coverage.

Focused tests apply to the selected stories, their assertions, and the rendered state they exercise.
Inspect passed and skipped counts alongside accessibility results. Test phone interactions at the
phone viewport when a sheet is hidden at desktop width. Additional themes, input methods, and full
product journeys need their own coverage under the repository's UI review rules.

Keep filesystem access as an operational fallback. Component discovery, complete examples, and
comparison on representative delivery tasks are separate
[evaluation gates](../engineering/agent-ui-evaluation.md); a preview URL or passing isolated story
does not establish product-wide UI quality.
