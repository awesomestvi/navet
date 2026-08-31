# Demo Workspace

This workspace builds the public Navet demo at `https://demo.navet.app`.

## Local commands

- `pnpm demo:dev`
- `pnpm build:demo`

## Cloudflare Pages

- project root: `apps/demo`
- build command: `pnpm --dir ../.. build:demo`
- output directory: `dist`
- production branch: `main`
- custom domain: `demo.navet.app`
- environment variables: `NODE_VERSION=22` and a `PNPM_VERSION` matching the root
  `packageManager` field

The production build uses `/` as its Vite base because the demo is deployed at the root of its own
origin. The demo contains sample data only and must not include real provider credentials.
