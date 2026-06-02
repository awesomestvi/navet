# Website Workspace

This workspace contains the public Navet marketing site entry, package manifest, Vite config, and
deployment-facing app shell.

## Purpose

- Keep website-only dependencies isolated from the runtime dashboard app.
- Give the public site its own build, dev server, and deployment root.
- Keep the marketing React composition in `src/app/marketing/` while the package boundary lives
  here.

## Local Commands

- `pnpm website:dev`
- `pnpm website:build`
- `pnpm website:bundle`
- `pnpm website:preview`

## Deployment

- Cloudflare Pages project root: repo root `/`
- Build command: `pnpm website:bundle`
- Output directory: `apps/website/dist`
- The website bundle stages the marketing site at `/`, the public demo at `/demo/`, and Storybook
  at `/storybook/` inside the same Cloudflare Pages output directory.
