# Navet AI Working Guide

This file is the complete baseline for repository work. Do not preload every linked document.
Read one additional area guide only when the task-routing table says it applies.

## Authority And Product Constitution

When instructions disagree, use this order:

1. `docs/product/vision.md` and `docs/product/design-principles.md` for durable product intent.
2. `docs/product/dashboard-principles.md` for dashboard behavior and UX decisions.
3. `docs/architecture/` for current technical contracts and ownership.
4. This file and scoped `AGENTS.md` files for agent behavior.
5. Area guides, conventions, and temporary implementation plans.

Do not silently reinterpret or edit the first three levels to make an implementation easier. A
change to product principles or a foundational architecture contract needs explicit maintainer
approval. Current code is evidence of behavior, not automatic authority over those principles.

## Product And Architecture

Navet is a provider-neutral smart-home dashboard. It runs as a standalone Docker app, a Home
Assistant add-on through Ingress, and a Home Assistant custom panel.

- Home Assistant is the reference adapter and supports the full feature set.
- Homey supports rooms, realtime entities, lighting, switches, sensors, locks, covers, thermostats, speaker
  controls, runnable flows and moods, people, notifications, Insights history, device capabilities,
  favorites, and app browsing.
- openHAB supports rooms, realtime entities, lighting, switches, fans, climate setpoints,
  speaker playback and volume, locks, covers, security sensors, batteries, and utility measurements.
- Hubitat and SmartThings are planned catalog metadata only; they have no runtime adapters.
- Shared product behavior belongs behind Navet-owned contracts, not Home Assistant payloads.
- Connected providers are peers. Users choose entities or sources per feature; do not introduce a
  global primary-provider preference. Route requests to each source's owning provider and expose
  only capabilities its adapter supports.

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
| Agent workflow, approval gates, previews, or stewardship | `docs/engineering/agentic-development.md` |

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

## Documentation Policy

- Write product documentation for first-time users. Assume no knowledge of Navet's previous
  releases, removed features, or internal terminology. Explain unfamiliar terms when needed.
- Describe the current workflow directly: what users need, what they do, and what happens next.
  Use current UI labels and concrete steps. Avoid historical comparisons such as "no setup code
  is required"; reserve them for changelogs or migration guides where they help existing users.
- Keep explanations clear, concise, and focused on the reader's task. Include technical details
  when they help the intended audience choose, configure, troubleshoot, or contribute.
- Update the relevant documentation whenever a change affects product behavior, capabilities,
  architecture, setup, or supported workflows. A code change alone does not require a docs update.
- Revise the existing explanation as a coherent whole. Remove obsolete instructions and verify
  affected steps, examples, and links against the current implementation.
- Document lasting behavior. Do not append patch-specific notes about individual bug fixes,
  temporary workarounds, or implementation details. Put release-specific changes in the changelog
  when requested.
- Keep shared guidance provider-neutral. Explain provider or deployment differences in the
  appropriate guide when they affect users, and link to it instead of duplicating instructions.
- Apply this policy to area guides as well as product documentation.

## Work Efficiently

1. Identify the owning module and its direct callers.
2. Read the single routed area guide.
3. Inspect the nearest implementation, test, and story relevant to the change.
4. Make the smallest change that improves the current interface without creating a competing one.
5. Run the narrowest validation that proves the behavior. Use `pnpm validate -- --dry-run` when
   the correct scope is unclear.

In a new worktree, install workspace dependencies with `pnpm install --frozen-lockfile` before
running dependency-backed checks. If registry access fails, retry with
`pnpm install --offline --frozen-lockfile` when the local store has the needed packages. If installation
still fails, a clean main checkout at the exact same commit can run
focused baseline tests for read-only research. State which checkout ran the tests; tests in main do
not validate uncommitted worktree changes.

Stop reading when the owner, rules, and verification path are clear. Existing plans and Markdown
are leads to verify, not evidence that the product still behaves that way.
