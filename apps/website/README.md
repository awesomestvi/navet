# Website Workspace

This workspace contains the public Navet marketing site entry, package manifest, Vite config, and
deployment-facing app shell.

## Purpose

- Keep website-only dependencies isolated from the runtime dashboard app.
- Give the public site its own build, dev server, and deployment root.
- Keep the marketing React composition in `packages/app/src/marketing/` while the package boundary lives
  here.

## Local Commands

- `pnpm website:dev`
- `pnpm website:build`
- `pnpm website:preview`

## Deployment

- Cloudflare Pages builds directly from the repo on push.
- Cloudflare Pages project root: `apps/website`
- Build command: `pnpm website:build`
- Output directory: `dist`
- The workspace build clones `index.html` into `/install/`, `/roadmap/`, and `/redirect/oauth/` so
  direct page loads work even when only the website bundle is deployed.
- The website bundle stages the marketing site at `/`, the public demo at `/demo/`, and Storybook
  at `/storybook/` inside the same Cloudflare Pages output directory.
- The Pages Function at `/api/music/apple/developer-token` signs short-lived MusicKit developer
  tokens. Configure `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and
  `APPLE_MUSIC_PRIVATE_KEY` as encrypted Cloudflare Pages secrets. The private key must be the
  PKCS#8 `.p8` key issued by Apple and must never be exposed as a public build variable.
