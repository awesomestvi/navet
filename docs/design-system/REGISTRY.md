# Navet recipe registry

The registry supplies typed starting compositions for the Navet React app. Choose a recipe by
behavior, adapt its translated labels and feature callbacks, and keep its shared UI-kit imports.
Storybook remains the surface for inspecting the resulting interaction and appearance.

## Choose a recipe

The [recipe manifest](../../packages/app/src/ui-kit/registry/recipes.json) defines the curated
selection. The registry builder and **Concepts / UI Kit Recipes** read that same manifest;
Storybook displays the exact template source. **Concepts / Registry Recipes** runs the templates
with deterministic local state.

| Recipe | Use |
| --- | --- |
| `controls-first-dialog` | Everyday device controls with secondary settings in More actions. |
| `detail-sheet` | A mobile detail sheet with shared header and separately padded body; `responsive` enables desktop. |
| `settings-field` | A labeled text field with associated validation and native required/disabled state. |
| `empty-card` | A small, medium or large empty card with an optional supported configuration action. |
| `compact-device-card` | A simple small device card with normalized state and one supported household action. |

These are **pilot** recipes. Selection identifies a starting composition, not a stable external API
or complete accessibility certification. The templates use Navet's theme context; dialogs also use
its i18n context. Features own capability checks, command routing, validation, persistence, save
errors and cancellation. Supply product copy through the existing translation workflow.

Dialogs and sheets require `returnFocusRef`: attach it to the launch button so keyboard focus returns
there when the surface closes. Card callers supply the dimensions through their dashboard layout.
Inspect the existing device family before choosing the compact recipe for a richer device.

## Build and inspect locally

From the repository root:

```bash
pnpm registry:build
pnpm registry:serve
```

Build writes the registry index and five item payloads to `.cache/ui-registry/r/`. Serve rebuilds
them and binds to `127.0.0.1:7331`. Restart the server after editing a recipe or shared contract.
Use `pnpm registry:serve 7332` to choose another port and update the URL used by your client.

The root `components.json` maps `@navet` to this local server. With the server running, inspect a
recipe using the pinned CLI:

```bash
pnpm dlx shadcn@4.21.0 list @navet
pnpm dlx shadcn@4.21.0 search @navet --query settings
pnpm dlx shadcn@4.21.0 view @navet/settings-field
pnpm dlx shadcn@4.21.0 add @navet/settings-field --dry-run
```

To create an editable starting template:

```bash
pnpm dlx shadcn@4.21.0 add @navet/settings-field
```

The installer writes `packages/app/src/components/recipes/settings-field.tsx`. Move and adapt this
composition within its owning feature when connecting real state. Its imports continue to resolve
to the canonical UI-kit. The payload declares no package installation, registry dependencies or
theme changes; the existing Navet workspace supplies React, icons and shared components.

## Agent discovery

The standard [shadcn MCP server](https://ui.shadcn.com/docs/mcp) can browse and search `@navet` using
the root `components.json`. Start the registry server, then register the pinned MCP command with
your client: `pnpm dlx shadcn@4.21.0 mcp`. Ask for the Navet recipe matching the intended behavior,
inspect its required context and contracts, and open its recipe and reference stories before
adapting it. Client registration is a local setup choice.

The pinned MCP server exposes names and descriptions in search and view responses. Use
`pnpm dlx shadcn@4.21.0 view @navet/<recipe>` to inspect the complete template, context, review
checks and source-derived contracts before installation. Registry metadata is part of the item
payload; a client may display only a summary.

Each item includes:

- intended use, required context and review checks from the curated manifest
- the exact typed template and its source fingerprint
- source-derived component import paths, props and union variants from the current component catalog
- source links to the executable recipe story and the existing reference story
- pilot maturity and Navet app scope

Story references contain source paths and exports. Resolve current story IDs from the running
Storybook index. The source fingerprint identifies the component catalog inputs; it does not prove
that any rendered state passed review.

## Maintain and evaluate

Edit the existing template and manifest together. Run `pnpm registry:build`, the focused
`scripts/ui-registry.test.mjs` test, `pnpm typecheck`, `pnpm check:ui-kit`, `pnpm check:stories`, and
the **Concepts / Registry Recipes** browser tests. Review the changed template in all four themes
and at its relevant viewport and card sizes. The builder checks exported contracts, import
boundaries and story references; browser tests exercise template behavior.

For each real UI task in the pilot, record the selected recipe, any missing composition information,
whether shared imports stayed intact, and composition corrections found during review. Judge the
pilot by correct recipe selection and fewer repeated composition corrections. Expand the registry
when those results support it.
