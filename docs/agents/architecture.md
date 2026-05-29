# Architecture

This file defines the implementation-facing architecture rules for Navet contributors and agents.

## Canonical Direction

- [`../technical/multi-backend-migration-guide.md`](../technical/multi-backend-migration-guide.md)
  is the canonical architecture reference.
- Navet uses provider-scoped runtime and normalized shared contracts.
- Home Assistant is the most mature provider, not the application architecture.
- Homey support is implemented today but is not at the same maturity level as Home Assistant.
- openHAB is part of the provider model and types, but remains planned.

## Preferred Shared Seams

Prefer these current shared seams before inventing new layers:

- `src/app/core/`
- `src/app/platform/`
- `src/app/stores/integration-store.ts`
- `src/app/hooks/` provider/runtime selectors and read hooks
- `src/auth/`
- `src/app/features/`

Provider-specific behavior belongs primarily in:

- `src/app/infrastructure/home-assistant/`
- `src/app/services/`
- `src/app/stores/home-assistant-store.ts`

## State Model

- Zustand is the shared app-state system.
- `AuthProvider` is the runtime-auth exception because it owns provider session bootstrap.
- Use selectors from `src/app/stores/selectors.ts`.
- Prefer normalized provider state and provider-scoped IDs in shared UI and shared feature flows.

## Ownership Rules

Shared layers own:

- normalized devices, rooms, room descriptors, and provider snapshots
- dashboard and settings state
- provider selection and current provider runtime state
- resource requests and action intents

Provider layers own:

- auth and session details
- runtime detection
- provider session bootstrap and teardown
- REST and WebSocket transport
- backend raw payload parsing
- resource rewriting and proxy behavior
- backend-specific action translation

## Rules For New Work

- Do not add new shared-UI dependencies on `HassEntity` or other backend raw types.
- Do not call Home Assistant services directly from generic feature components or shared card
  controllers.
- Do not construct Home Assistant resource URLs in shared UI when resolver seams already own that
  behavior.
- Prefer extending provider/runtime seams over adding provider-specific conditionals in shared code.

## Current Runtime Surfaces

- `src/auth/AuthProvider.tsx` resolves runtime and provider sessions.
- `src/app/runtime/app-mode.ts` exposes coarse runtime helpers for feature flows that truly need
  mode awareness.
- `src/app/services/integration-registry.service.ts` is the provider adapter seam for provider
  session lifecycle, feature capabilities, and resource normalization.
- `src/app/stores/home-assistant-store.ts` tracks Home Assistant provider state.
- `src/app/stores/integration-store.ts` aggregates provider runtime state and normalized snapshots.
- `src/app/hooks/use-provider-runtime.ts` and store selectors are the preferred app-facing read
  surface.

## Dashboard Rules

- Dashboard card registration lives in
  `src/app/features/dashboard/utils/card-renderer.tsx`.
- Dashboard section routing lives in
  `src/app/features/dashboard/components/dashboard-section-router.tsx`.
- Dashboard persisted state belongs under
  `src/app/features/dashboard/stores/`.

Do not move dashboard-specific ownership back into generic shared utility folders.

## Related Docs

- [project-map.md](project-map.md)
- [../../design-system/UI-GUIDELINES.md](../../design-system/UI-GUIDELINES.md)
- [testing.md](testing.md)
