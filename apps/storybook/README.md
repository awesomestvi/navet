# Storybook Workspace

This workspace builds the public Navet Storybook at `https://storybook.navet.app`.

## Local commands

- `pnpm storybook`
- `pnpm storybook:build`
- `pnpm test:storybook`

## Cloudflare Pages

- project root: `apps/storybook`
- build command: `pnpm --dir ../.. storybook:build`
- output directory: `dist`
- production branch: `main`
- custom domain: `storybook.navet.app`
- environment variables: `NODE_VERSION=22` and a `PNPM_VERSION` matching the root
  `packageManager` field

The production build sets `STORYBOOK_BASE_PATH=/` because Storybook is deployed at the root of its
own origin.
