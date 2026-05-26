# Entity Fixtures

Read this file before creating or changing Home Assistant fixtures, mocks, or story data that stands in for Home Assistant entities.

## Fixture Source Rules

- Build fixture data that simulates real Home Assistant entities.
- Do not create perfect mock entities just because Navet UI expects them.
- Fixtures must expose broken assumptions in Navet.
- Prefer extending the shared fixtures under `src/test/fixtures/home-assistant/` instead of inventing inline mocks inside tests.
- If a fixture does not look like something a real Home Assistant instance could emit, do not use it.

## Fixture Organization

Store fixtures by domain or integration where possible, including:

- `light`
- `climate`
- `camera`
- `media_player`
- `vacuum`
- `lock`
- `cover`
- `sensor`
- `binary_sensor`
- `switch`
- `weather`
- `alarm_control_panel`

Prefer these locations:

- domain-level shapes: `src/test/fixtures/home-assistant/entities/`
- vendor or integration variants: `src/test/fixtures/home-assistant/integrations/`
- auth/runtime payloads: `src/test/fixtures/home-assistant/auth/`
- URL cases: `src/test/fixtures/home-assistant/resources/`

## Required Scenario Variants

Each fixture set should include:

- normal entity
- unavailable entity
- unknown entity
- missing optional attributes
- partial attributes
- edge-case `supported_features`
- realistic timestamps and context where used

For URL-bearing domains such as `camera`, `media_player`, `person`, `device_tracker`, and `image`, also include where relevant:

- relative Home Assistant URL
- signed URL
- ingress-aware path
- external URL
- broken or missing URL

## Data Integrity Rules

- Keep Home Assistant field names and shapes intact at the fixture boundary.
- Do not silently replace unknown or missing data with idealized values.
- Use realistic `entity_id`, `state`, `attributes`, `last_changed`, `last_updated`, and `context`.
- Add integration-specific variants when vendors materially change attributes, media URLs, or service behavior.
- Preserve realistic domain prefixes in `entity_id`. Do not use impossible ids.
- Use documented state names. Do not invent friendly state aliases for fixtures.
- Keep `supported_features` and other numeric flags realistic instead of arbitrary.

## What Not To Do

- Do not build fixtures from Navet view models.
- Do not omit `context`, timestamps, or attribute containers when production code reads them.
- Do not store only one idealized fixture per domain.
- Do not create separate local mock builders inside tests when a shared fixture module should own the scenario.

## Known Navet Failure Modes To Guard Against

- perfect happy-path fixture objects that hide missing-attribute bugs
- mapper tests that use partial fake data no real Home Assistant instance would emit
- camera and media fixtures that ignore signed or proxied URL behavior
- auth tests that use fake session shapes unrelated to the real OAuth or ingress flows

## When To Add A New Fixture

Add or extend a shared fixture when:

- a new Home Assistant domain is supported
- a vendor integration materially changes the payload shape
- a regression was caused by a missing, malformed, or partial field
- a URL, auth, or ingress edge case needs to be preserved

If you discover an unrealistic existing fixture, fix the fixture and rewrite the affected tests instead of adding another fake variant next to it.

## Existing Repo Anchors

- Entity fixtures: `src/test/fixtures/home-assistant/entities/`
- Integration fixtures: `src/test/fixtures/home-assistant/integrations/`
- API fixtures: `src/test/fixtures/home-assistant/api/`
- Auth fixtures: `src/test/fixtures/home-assistant/auth/`
- Resource URL fixtures: `src/test/fixtures/home-assistant/resources/`
