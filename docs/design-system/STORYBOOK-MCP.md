# Storybook MCP pilot

The opt-in local MCP server helps agents discover Navet story IDs and obtain preview links.
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

## Use the available tools

1. Call `list-all-documentation` with `withStoryIds: true` to discover component and story IDs.
2. Call `get-documentation` with a returned component ID. Check whether actual props and usage
   examples are present. Resolve incomplete or conflicting output through the source-derived
   catalog and the component's current source and story.
3. Use `get-documentation-for-story` when a particular variant needs more context.
4. Call `preview-stories` with discovered story IDs and inspect the resulting rendered previews.
5. Use `get-stories-by-component` for direct and transitive consumers of a changed shared piece.
   Its distance limit may omit consumers; inspect the returned clipping information.

The pilot enables documentation and development tools. MCP test tools are disabled; focused
checks run through Navet's existing validation commands and browser tools. A preview URL proves
that the story resolves, not that its interaction, accessibility, themes or responsive states pass.

## Observed extraction limits

The pilot discovered the real sheet, form-field and BaseCardDialog story IDs. Sheet documentation
returned source-matching props including `isOpen`, `onOpenChange`, `title` and `responsive`.
Form-field documentation returned only a heading and Stories section. BaseCardDialog returned
story names and wrapper snippets without its discriminated props. Generated snippets may show
`@navet/app` imports and local wrapper components; select the stable UI-kit entrypoint and read
the actual composition recipe before using them as implementation examples.

The discovered form error-state preview displayed its validation message and an input with
`aria-invalid=true`. The vacuum unavailable preview displayed its unavailable state. The sheet
preview opened at 390 × 844; at desktop width the mobile sheet remains hidden. These checks
verify three preview targets, not a product-wide UX audit.

Keep filesystem access as an operational fallback. Current MCP extraction does not establish
the design-system discovery exit gate. Broader component coverage, meaningful examples, focused
testing integration and comparison on representative delivery tasks remain evaluation work.
