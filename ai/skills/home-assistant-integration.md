# Home Assistant Integration

Read this file before changing Home Assistant-facing behavior, mapping, actions, auth-sensitive
resources, or Home Assistant-specific tests.

## Source Of Truth

- official Home Assistant documentation is the source of truth for Home Assistant adapter behavior
- use `/homeassistant/core` as the local implementation reference for Home Assistant edge cases,
  payload shapes, service behavior, and undocumented runtime details
- Home Assistant documentation does not define Navet's overall architecture
- if Home Assistant behavior is unclear, check official docs first, then confirm against
  `/homeassistant/core`
- if Home Assistant docs and Navet implementation disagree, follow Home Assistant docs and
  reconcile Navet behavior without treating Navet's current implementation as authoritative

## Current Repo Areas

Home Assistant-specific behavior should primarily live in:

- `packages/provider-homeassistant/`
- app-owned compatibility seams in `packages/app/src/infrastructure/home-assistant/`,
  `packages/app/src/services/`, and legacy adapters under
  `packages/app/src/stores/home-assistant-store.ts`
- Home Assistant-aware feature code under `packages/app/src/features/` that consumes normalized data
- Home Assistant fixtures under `packages/app/src/test/fixtures/home-assistant/`

## Rules

- verify entity states, attributes, supported features, and service payloads against Home Assistant
  docs, `/homeassistant/core`, or real payloads
- prefer realistic fixtures over invented happy-path mock objects
- do not leak Home Assistant raw types or URL construction into shared UI when a provider seam
  already exists
- keep Home Assistant-specific behavior scoped to the Home Assistant adapter boundary
- prefer moving new Home Assistant-facing mapping, command translation, auth-sensitive resource
  logic, and event handling into `packages/provider-homeassistant/`
- inspect `/homeassistant/core/homeassistant/` for implementation behavior and
  `/homeassistant/core/tests/` for regression evidence when Home Assistant docs are incomplete

## Required Follow-Through

If behavior changes:

- update or add realistic fixtures under `packages/app/src/test/fixtures/home-assistant/`
- update boundary or feature tests
- update relevant docs when provider behavior or runtime assumptions changed
