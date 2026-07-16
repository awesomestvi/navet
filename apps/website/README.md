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

- Cloudflare Pages builds the marketing site directly from the repo on push.
- Cloudflare Pages project root: `apps/website`
- Build command: `pnpm --dir ../.. website:build`
- Output directory: `dist`
- Production domain: `navet.app`
- Demo, Storybook, and docs deploy from separate Cloudflare Pages projects at
  `demo.navet.app`, `storybook.navet.app`, and `docs.navet.app`.
- The website build clones `index.html` into `/roadmap/` and `/redirect/oauth/` so direct page
  loads work when only the marketing output is deployed.
- The Pages Function at `/api/music/apple/developer-token` signs short-lived MusicKit developer
  tokens. Configure `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, and
  `APPLE_MUSIC_PRIVATE_KEY` as encrypted Cloudflare Pages secrets. The private key must be the
  PKCS#8 `.p8` key issued by Apple and must never be exposed as a public build variable.
- Cloudflare discovers the Pages Function from `apps/website/functions` because the website app is
  the marketing project's deployment root. The other Pages projects must use their own app roots
  so they do not publish this endpoint.
