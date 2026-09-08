# Navet AI Working Guide

This file is the complete baseline for repository work. Do not preload every linked document.
Read one additional area guide only when the task-routing table says it applies.

## Product And Architecture

Navet is a provider-neutral smart-home dashboard. It runs as a standalone Docker app, a Home
Assistant add-on through Ingress, and a Home Assistant custom panel.

- Home Assistant is the reference adapter and supports the full feature set.
- Homey and openHAB are implemented standalone providers for rooms, realtime entities, lighting,
  switches, and sensors.
- Hubitat and SmartThings are planned catalog metadata only; they have no runtime adapters.
- Shared product behavior belongs behind Navet-owned contracts, not Home Assistant payloads.

Target dependency direction:

```text
@navet/core <- @navet/ui <- @navet/app
@navet/core <- provider packages <- @navet/app
```

`@navet/app` still owns current compatibility models and much shared UI. Improve this
incrementally; do not move code merely to make the target tree look complete.

## Find The Code First

| Looking for | Start in |
| --- | --- |
| Product composition, dashboard behavior, state, services | `packages/app/src` |
| Provider-neutral contracts and runtime types | `packages/core/src` |
| Provider-neutral shared UI | `packages/ui/src` |
| Home Assistant, Homey, or openHAB behavior | `packages/provider-<provider>/src` |
| Standalone, demo, website, docs, panel, Storybook entrypoints | `apps/<app>/src` or `apps/<app>` |
| Home Assistant release surfaces | `platform/home-assistant` |
| Local marketing plans, WIP, videos, tutorials | `marketing` |

Do not assume a root `src/`. Search the narrowest likely package first with `rg`; broaden only
when the first search does not identify the owner or callers.

## Task Router

Open only the first matching guide. Follow a linked deep reference only when the task changes that
specific contract or policy. If the work genuinely crosses two areas, open those two guides; do
not expand that into the whole table.

| Task | Area guide |
| --- | --- |
| Architecture, package ownership, provider/runtime contracts | `docs/agents/architecture.md` |
| Home Assistant mapping, actions, or entity behavior | `ai/skills/home-assistant-integration.md` |
| Authentication, sessions, runtime detection, deployment | `ai/skills/auth-deployment.md` |
| Dashboard UI, cards, settings, dialogs, navigation | `ai/skills/navet-ux.md` |
| Cameras, media artwork, RSS, entity pictures, external URLs | `ai/skills/external-resources.md` |
| Performance, kiosk, rendering, animation, bundle size | `ai/skills/performance.md` |
| Tests, fixtures, test deletion, or tier changes | `ai/skills/testing-architecture.md` |
| Marketing, community content, videos, tutorials | `ai/skills/marketing-workspace.md` |
| Release, CI, or uncertainty about validation commands | `docs/agents/commands.md` |

If no row matches, this file is sufficient. `ai/agents.md` is a navigation index, not mandatory
second-stage reading.

## Non-Negotiable Rules

- `@navet/core` must not import React, provider SDKs, API clients, or provider-specific code.
- `@navet/ui` must not import provider-specific code.
- Shared UI uses normalized Navet state and provider-neutral commands. Do not add raw
  `HassEntity`, Home Assistant service payloads, or backend conditionals to shared interfaces.
- Provider auth, transport, mapping, realtime updates, and command translation belong in provider
  packages or an explicitly documented migration seam.
- Prefer `IntegrationProviderId`, `SmartHomeProviderAdapter`, `NavetEntity`, `NavetCommand`,
  `CommandResult`, provider-scoped IDs, canonical IDs, runtime, contract, capability, feature
  service, and resource resolution.
- `NavetDevice`, `NavetRoom`, `NavetRoomDescriptor`, and `NavetProviderSnapshot` are current
  `@navet/app` compatibility models, not target public contracts.
- Home Assistant behavior: official documentation first; inspect `/homeassistant/core` only for
  implementation details and edge cases. It does not define Navet architecture.
- Preserve persisted-data compatibility. Consult `docs/architecture/persisted-data-migrations.md`
  only when changing or removing a migration.
- Do not change tests merely to match an implementation. Classify touched legacy tests as Keep,
  Rewrite, or Delete.
- Never use or suggest `--no-verify` for commits or pushes.
- Preserve unrelated dirty-worktree changes.
- The root `marketing/` directory is local and fully Git-ignored. Never force-add it.

## Work Efficiently

1. Identify the owning module and its direct callers.
2. Read the single routed area guide.
3. Inspect the nearest implementation, test, and story relevant to the change.
4. Make the smallest change that improves the current interface without creating a competing one.
5. Run the narrowest validation that proves the behavior. Use `pnpm validate -- --dry-run` when
   the correct scope is unclear.

Stop reading when the owner, rules, and verification path are clear. Existing plans and Markdown
are leads to verify, not evidence that the product still behaves that way.
