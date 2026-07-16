# Documentation Workspace

This workspace builds the public Navet documentation site at `https://docs.navet.app` with Astro
Starlight.

## Content model

Public pages stay in their canonical repository locations instead of being copied into the app.
`src/content.config.ts` contains the explicit allowlist and public route for each Markdown file.
Files under `ai/` and internal maintainer, release, testing, and audit paths are not published unless
they are deliberately added to that map.

Every published Markdown file needs Starlight frontmatter with at least `title`, `description`, and
an exact GitHub `editUrl`.

## Local commands

The docs workspace requires Node.js 22.12 or newer, matching the supported Astro runtime.

- `pnpm docs:dev`
- `pnpm docs:build`
- `pnpm docs:preview`

Astro telemetry is disabled in all three commands.

## Cloudflare Pages

Create a separate Pages project for the documentation site with:

- project root: `apps/docs`
- build command: `pnpm --dir ../.. docs:build`
- output directory: `dist`
- production branch: `main`
- custom domain: `docs.navet.app`
- environment variable: `NODE_VERSION=22`

The output is fully static and includes Pagefind search data and a sitemap. Cloudflare should not
run a second framework preset or HTML minifier over the generated output.
