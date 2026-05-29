# Project Map

This file is the current implementation map for Navet.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build | Vite 8 |
| Package manager | pnpm 11 |
| Styling | Tailwind CSS 4, Radix UI |
| State | Zustand 5 |
| Tests | Vitest 4, Testing Library, Storybook Vitest project |
| Storybook | Storybook 10 |

## Repo Structure

```text
src/
  api/                 # Home Assistant API client helpers and tests
  auth/                # runtime auth adapters, provider selection, discovery, auth types
  panel/               # Home Assistant panel entrypoint
  test/                # shared test helpers and Home Assistant fixtures
  app/
    core/              # Navet-owned contracts and mapper entry points
    platform/          # provider-facing interfaces and shared platform abstractions
    stores/            # shared Zustand stores and selectors
    services/          # provider-facing services and integration facades
    infrastructure/    # provider-specific runtime, auth, media, resources, transport
    features/          # feature-owned UI and logic
    components/        # shared UI authoring layers
    ui-kit/            # stable docs/story import surface
    storybook/         # Storybook helpers and frames
    runtime/           # runtime-mode helpers
    hooks/             # shared hooks and selectors
    i18n/              # localization
    demo/              # public demo app
```

## Key Files And Paths

| Path | Purpose |
|---|---|
| `src/app/App.tsx` | App shell composition, auth split, bootstrap side effects, network and error surfaces |
| `src/auth/AuthProvider.tsx` | Runtime auth and provider session ownership |
| `src/app/core/navet.ts` | Navet-owned device, room, provider, action, and resource contracts |
| `src/app/core/navet-mappers.ts` | Provider-to-Navet normalization entry points |
| `src/app/platform/provider-feature-services.ts` | Provider feature service interfaces |
| `src/app/services/integration-registry.service.ts` | Provider adapter registry for lifecycle, capabilities, feature services, and resource normalization |
| `src/app/services/integration-bootstrap.service.ts` | Shared provider session bootstrap and teardown entry surface |
| `src/app/services/integration-resource.service.ts` | Shared provider resource resolution and normalized resource URL entry surface |
| `src/app/stores/integration-store.ts` | Cross-provider runtime aggregation and normalized provider snapshot state |
| `src/app/stores/home-assistant-store.ts` | Home Assistant provider runtime slice |
| `src/app/hooks/use-provider-runtime.ts` | Main app-facing provider runtime hook |
| `src/app/infrastructure/home-assistant/` | Home Assistant runtime, auth, transport, media, and resources |
| `src/app/features/dashboard/hooks/use-dashboard-controller.ts` | Dashboard orchestration controller |
| `src/app/features/dashboard/utils/card-renderer.tsx` | Card registration and rendering entry surface |
| `src/app/features/dashboard/components/dashboard-section-router.tsx` | Top-level section routing |
| `src/app/components/system/` | Curated internal UI system exports |
| `src/app/ui-kit/` | Stable docs/story import surface |

## Shared UI Layers

- `src/app/components/primitives/`
  - low-level reusable UI building blocks
- `src/app/components/patterns/`
  - composed shared UI patterns
- `src/app/components/shared/`
  - app-specific shared UI and dashboard-specific helpers
- `src/app/components/system/`
  - curated internal export surface for stable primitives, patterns, and tokens
- `src/app/ui-kit/`
  - canonical docs/story import surface for stable shared UI

## Top-Level Product Sections

Current section model is driven from the dashboard feature and navigation helpers:

- `home`
- `energy`
- `climate`
- `security`
- `lights`
- `media`
- `tasks`
- `settings`

Supporting feature folders also exist for weather, calendar, person, sensors, notifications,
scenes, rss, vacuum, and auth flows.

## Current Provider Model

- `home_assistant`: implemented and most mature
- `homey`: implemented through shared runtime, entity-runtime, and service paths, but not feature-parity complete
- `openhab`: present in provider IDs and planning surfaces, not implemented as a runtime yet

## Rules Of Thumb

- Import across feature boundaries through a feature `index.ts` or `index.tsx` where available.
- Prefer normalized provider/runtime state over provider-specific internals in shared UI.
- Prefer current file paths over remembered historical paths when updating docs.
- If work touches provider boundaries, read
  `docs/technical/multi-backend-migration-guide.md` first.
