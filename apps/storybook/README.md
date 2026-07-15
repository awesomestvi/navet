# Storybook Workspace

This workspace builds the public Navet Storybook at `https://storybook.navet.app`.

## Local commands

- `pnpm storybook`
- `pnpm storybook:build`
- `pnpm test:storybook`

## Cloudflare Pages

- project root: repository root
- build command: `pnpm storybook:build`
- output directory: `apps/storybook/dist`
- production branch: `main`
- custom domain: `storybook.navet.app`
- environment variables: `NODE_VERSION=22` and `PNPM_VERSION=11.9.0`

The production build sets `STORYBOOK_BASE_PATH=/` because Storybook is deployed at the root of its
own origin.
