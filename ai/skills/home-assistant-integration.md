# Home Assistant Integration

Read this file before changing Home Assistant-facing behavior, mapping, actions, auth-sensitive
resources, or Home Assistant-specific tests.

## Source Of Truth

- official Home Assistant documentation is the source of truth for Home Assistant adapter behavior
- Home Assistant documentation does not define Navet's overall architecture
- if Home Assistant docs and Navet implementation disagree, assume Navet is wrong first

## Current Repo Areas

Home Assistant-specific behavior currently lives primarily in:

- `packages/provider-homeassistant/`
- `packages/app/src/infrastructure/home-assistant/`
- `packages/app/src/services/`
- `packages/app/src/stores/home-assistant-store.ts`
- Home Assistant-aware feature code under `packages/app/src/features/`
- Home Assistant fixtures under `packages/app/src/test/fixtures/home-assistant/`

## Rules

- verify entity states, attributes, supported features, and service payloads against Home Assistant
  docs or real payloads
- prefer realistic fixtures over invented happy-path mock objects
- do not leak Home Assistant raw types or URL construction into shared UI when a provider seam
  already exists
- keep Home Assistant-specific behavior scoped to the Home Assistant adapter boundary
- prefer moving new Home Assistant-facing mapping, command translation, auth-sensitive resource
  logic, and event handling into `packages/provider-homeassistant/`

## Required Follow-Through

If behavior changes:

- update or add realistic fixtures under `packages/app/src/test/fixtures/home-assistant/`
- update boundary or feature tests
- update relevant docs when provider behavior or runtime assumptions changed
