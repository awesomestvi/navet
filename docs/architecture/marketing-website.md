# Marketing Website

## Purpose

Navet's marketing website exists to attract users, especially Home Assistant users who want a
cleaner and more polished smart-home dashboard.

This site is user-focused. It is not a developer platform website and should not lead with SDKs,
provider adapters, architecture, or Storybook.

## Audience And Positioning

Primary audience:

- Home Assistant users
- smart-home dashboard users
- wall-panel, tablet, and kiosk users

Secondary and future audience:

- developers
- integration providers
- smart-home platform maintainers

Current positioning:

> Home Assistant as the brain. Navet as the beautiful frontend.

Homepage structure and copy should reinforce that message.

## Boundaries And Reuse

- `@navet/ui` is the target provider-neutral shared UI boundary.
- The current website implementation still primarily reuses app-owned shared UI from
  `packages/app/src/components/primitives/`, `packages/app/src/components/patterns/`, and
  `packages/app/src/ui-kit/`.
- Shared primitives currently stay in `packages/app/src/components/primitives/` or `packages/app/src/components/patterns/` unless the work is explicitly extracting shared UI into `@navet/ui`.
- Theme tokens and surface logic stay in the existing theme/token layers.
- Dashboard cards stay in dashboard or feature layers.
- Marketing sections live under `packages/app/src/marketing/`.
- Website-specific package entry and Vite config live under `apps/website/`, not in the runtime
  app shell.

Strict reuse rules:

- Do not duplicate existing Button, Card, Typography, Surface, Grid, Stack, or theme primitives.
- Do not fork theme tokens for the website.
- If a missing primitive is needed, add it to the shared UI layer first and then consume it from
  marketing.
- When documenting or reviewing reuse, distinguish the current app-owned implementation surface
  from the long-term `@navet/ui` ownership target.
- Marketing sections should compose existing primitives and existing dashboard cards.
- Marketing previews must use static demo data and must not depend on live Home Assistant state,
  user tokens, or external APIs.

## Storybook Relationship

- Storybook is the main review surface for primitives, themes, dashboard cards, and marketing sections.
- Marketing stories live under the `Pages/Marketing/` title root.
- New primitives required by marketing must be documented in Storybook.
- Storybook is a secondary credibility link in the website footer, not a primary CTA.

Required stories:

- `Pages/Marketing/Hero`
- `Pages/Marketing/ProductPreview`
- `Pages/Marketing/FeatureGrid`
- `Pages/Marketing/ThemeShowcase`
- `Pages/Marketing/DemoCTA`
- `Pages/Marketing/InstallOptions`
- `Pages/Marketing/CurrentSupport`
- `Pages/Marketing/Roadmap`

## Content, Data, And Links

Content rules:

- Keep messaging user-focused.
- Lead with the dashboard experience.
- Mention Home Assistant clearly.
- Do not lead with APIs, SDKs, provider adapters, architecture, or Storybook.
- Do not overpromise future integrations.
- Only list supported cards, widgets, entities, and providers that exist in current docs or code.
- Future provider expansion belongs in the roadmap, not the hero.

Data rules:

- Use centralized static fixtures for all marketing previews.
- No live Home Assistant dependency.
- No user token dependency.
- No external API dependency for initial render.
- Demo data should be realistic, reusable, and non-sensitive.

Routing and links:

- Public website routes are resolved by the marketing route helpers.
- External links are centralized in `packages/app/src/marketing/constants/marketingLinks.ts`.
- This includes demo, docs/install links, GitHub, roadmap, and Storybook URLs.
- The public website workspace root is `apps/website/`.

## Install Honesty And Performance

Install/support rules:

- Present supported install paths clearly without implying that one path is the universal default.
- Keep setup messaging accurate about what each install path trades off.
- Advanced or experimental paths must be labeled honestly.
- Do not promote unsupported features or fragile paths as mature.

Performance expectations:

- Keep the website responsive on mobile, tablet, and desktop.
- Avoid heavy runtime dependencies.
- Avoid unnecessary animation or expensive always-on blur.
- Keep previews lightweight.
- Do not ship Storybook-only helpers into production bundles.
