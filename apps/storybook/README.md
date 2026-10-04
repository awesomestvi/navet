# Storybook Workspace

This workspace builds the public Navet Storybook at `https://storybook.navet.app`.

## Local commands

- `pnpm storybook`
- `pnpm storybook:build`
- `pnpm test:storybook`

## Interactive lighting fixtures

Lighting stories install their synthetic entities in the preview runtime before mounting controls.
Light commands update that scenario, and its normalized entities supply both dashboard summaries
and compatibility snapshots. Acknowledged edits remain visible when controls close and reopen
within the story. These observations demonstrate synthetic state, not connected provider persistence.

Configure story-specific color capabilities through `previewRuntime.scenario`. On/off-only fixtures
use the `onoff` color mode without brightness or temperature attributes. Restore the enclosing
scenario and captured stores during teardown so adjacent stories begin with their own state.

## Cloudflare Pages

- project root: `apps/storybook`
- build command: `pnpm --dir ../.. storybook:build`
- output directory: `dist`
- production branch: `main`
- custom domain: `storybook.navet.app`
- environment variable: `NODE_VERSION=22`; use the pnpm version pinned in root `package.json`

The production build sets `STORYBOOK_BASE_PATH=/` because Storybook is deployed at the root of its
own origin.
