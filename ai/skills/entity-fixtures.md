# Entity Fixtures

Read this before creating or changing Home Assistant fixtures, mocks, or story data.

## Source Rules

- build fixture data that simulates real Home Assistant entities
- do not create perfect mock entities just because Navet UI expects them
- fixtures should expose broken assumptions in Navet
- prefer the shared fixture tree under `packages/app/src/test/fixtures/home-assistant/`
- if a fixture does not look like something a real Home Assistant instance could emit, do not use it

## Fixture Locations

- domain-level shapes: `packages/app/src/test/fixtures/home-assistant/entities/`
- vendor or integration variants: `packages/app/src/test/fixtures/home-assistant/integrations/`
- auth and runtime payloads: `packages/app/src/test/fixtures/home-assistant/auth/`
- API payloads: `packages/app/src/test/fixtures/home-assistant/api/`
- resource and URL cases: `packages/app/src/test/fixtures/home-assistant/resources/`

## Required Variants

Each fixture set should include the variants that matter for the code under test:

- normal entity
- unavailable entity
- unknown entity
- missing optional attributes
- partial attributes
- realistic `supported_features`
- realistic timestamps and context where used

For URL-bearing domains such as `camera`, `media_player`, `person`, `device_tracker`, and `image`,
also include where relevant:

- relative Home Assistant URL
- signed URL
- ingress-aware path
- external URL
- broken or missing URL

## Integrity Rules

- keep Home Assistant field names and shapes intact at the fixture boundary
- do not silently replace unknown or missing data with idealized values
- use realistic `entity_id`, `state`, `attributes`, `last_changed`, `last_updated`, and `context`
- preserve realistic domain prefixes in `entity_id`
- use documented state names
- keep `supported_features` and similar numeric flags realistic

## Do Not

- build fixtures from Navet view models
- omit `context`, timestamps, or attribute containers when production code reads them
- store only one idealized fixture per domain
- create separate local mock builders when a shared fixture module should own the scenario

## Add Or Update Fixtures When

- a new Home Assistant domain is supported
- a vendor integration materially changes the payload shape
- a regression was caused by a missing, malformed, or partial field
- a URL, auth, or ingress edge case needs to be preserved
