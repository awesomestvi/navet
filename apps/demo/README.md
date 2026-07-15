# Demo Workspace

This workspace builds the public Navet demo at `https://demo.navet.app`.

## Local commands

- `pnpm demo:dev`
- `pnpm build:demo`

## Cloudflare Pages

- project root: repository root
- build command: `pnpm build:demo`
- output directory: `apps/demo/dist`
- production branch: `main`
- custom domain: `demo.navet.app`
- environment variables: `NODE_VERSION=22` and `PNPM_VERSION=11.9.0`

The production build uses `/` as its Vite base because the demo is deployed at the root of its own
origin. The demo contains sample data only and must not include real provider credentials.
