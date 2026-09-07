# Navet AI Navigation Index

Start with the root [`AGENTS.md`](../AGENTS.md). It contains the complete baseline and task router.
This file helps locate deeper context when the owner is still unclear; it is not required reading
for every task.

## Choose One Route

| Area | Read first | Open deeper references only when changing |
| --- | --- | --- |
| Package or provider architecture | [`docs/agents/architecture.md`](../docs/agents/architecture.md) | package dependency rules, provider contract shape, or UI ownership |
| Home Assistant behavior | [`skills/home-assistant-integration.md`](skills/home-assistant-integration.md) | concrete payload/service edge cases in `/homeassistant/core` |
| Auth and deployment | [`skills/auth-deployment.md`](skills/auth-deployment.md) | session persistence, OAuth, Ingress, panel, or proxy behavior |
| Dashboard product UI | [`skills/navet-ux.md`](skills/navet-ux.md) | a new visual recipe, design-system primitive, or brand rule |
| External resources | [`skills/external-resources.md`](skills/external-resources.md) | camera, media, RSS, or URL contracts |
| Performance | [`skills/performance.md`](skills/performance.md) | kiosk budgets, animation, rendering, or bundle behavior |
| Tests | [`skills/testing-architecture.md`](skills/testing-architecture.md) | tier membership, provider strategy, or fixture design |
| Marketing workspace | [`skills/marketing-workspace.md`](skills/marketing-workspace.md) | planning, WIP lifecycle, deliverables, or publication |
| Commands and releases | [`docs/agents/commands.md`](../docs/agents/commands.md) | validation selection, CI, packaging, or release work |

Do not read every row. If a task crosses two areas, read at most the two directly applicable
guides, then follow only the precise deep link needed by the change.

## Ownership Shortcuts

- App composition and current shared dashboard behavior: `packages/app/src`
- Provider-neutral model and command contracts: `packages/core/src`
- Target shared UI package: `packages/ui/src`
- Provider implementations: `packages/provider-homeassistant/src`, `packages/provider-homey/src`,
  `packages/provider-openhab/src`
- Public documentation: `apps/docs`
- Current contributor architecture: `docs/architecture` and `docs/agents`
- Local private marketing workspace: `marketing`

Start searches in the owner above. Search by exported symbol or product term before searching by a
generic implementation word.

## Current Facts Worth Keeping In Context

- Home Assistant has the advanced feature services.
- Homey and openHAB currently cover rooms, realtime entities, lighting, switches, and sensors.
- Hubitat and SmartThings are planned metadata, not packages or runtime adapters.
- The app can retain multiple implemented provider sessions and aggregate selected providers.
- `packages/app/src/components` and `packages/app/src/ui-kit` are current implementation seams;
  `@navet/ui` is the target owner.

Everything more specific should be verified in current code or the single routed guide rather
than accumulated as mandatory preflight context.
