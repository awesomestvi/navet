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
- `pnpm website:preview`

## Deployment

- Cloudflare Pages root directory: `apps/website`
- Build command: `pnpm build`
- Output directory: `dist`
- Repo-root fallback: keep the Cloudflare project at `/`, use `pnpm website:build`, and let the
  repo-root `wrangler.jsonc` point Pages at `apps/website/dist`.
