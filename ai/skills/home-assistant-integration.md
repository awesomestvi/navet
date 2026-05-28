# Home Assistant Integration

Read this file before changing Home Assistant-facing code, domain mapping, service calls, resource handling, or tests.

## Source Of Truth

- Official Home Assistant documentation is the source of truth.
- Home Assistant documentation governs Home Assistant adapter behavior, not Navet's overall multi-backend architecture.
- Do not infer expected behavior from Navet's current implementation.
- If Home Assistant docs conflict with Navet implementation, assume Navet is wrong unless proven otherwise by a higher-priority product requirement.
- If you cannot point to a Home Assistant doc page, a real captured payload, or an explicit Navet product requirement, do not invent behavior.

## Required Verification For Supported Domains

For every supported domain or integration under change, verify:

- `entity_id` format
- domain type
- valid state values
- relevant attributes
- `supported_features`
- service call names and payloads
- `unavailable` and `unknown` states
- missing optional attributes
- partial or malformed-but-plausible attributes

This verification is mandatory for changes in:

- `src/app/hooks/device-mappers/`
- `src/app/services/ha-entity-service.ts`
- `src/app/features/*` card controllers and renderers
- `src/app/infrastructure/home-assistant/`

## Data Rules

- Prefer compatibility with real Home Assistant behavior over idealized mock data.
- Do not invent entity attributes without documentation or real examples.
- Do not normalize fixtures until the boundary under test requires it.
- Any new Home Assistant integration support must include realistic fixture coverage.
- Do not collapse `unknown`, `unavailable`, and missing data into the same fallback unless the product explicitly wants that.
- Do not assume a domain has the attributes Navet currently reads. Verify them first.
- Do not assume vendor integrations use identical payloads just because the domain matches.

## What Not To Do

- Do not write tests from the current Navet mapper output backward.
- Do not add a new supported service call without checking the documented Home Assistant service name and payload.
- Do not add fake attributes to make a card render more nicely.
- Do not treat Home Assistant frontend behavior as identical across custom panel, ingress, and standalone Docker.

## Known Navet Failure Modes To Guard Against

- tests that mirror current mapper output instead of Home Assistant contracts
- assuming all media or camera URLs can be used directly in the browser
- assuming helper domains and vendor domains always expose complete attributes
- assuming signed URLs, ingress paths, or panel same-origin behavior are interchangeable
- assuming a state that looks convenient in the UI is a documented Home Assistant state

## Required Test And Fixture Follow-Through

If you change Home Assistant-facing behavior, also update or add:

- a shared fixture in `src/test/fixtures/home-assistant/` when the payload shape changes
- a contract or boundary test for the changed behavior
- `ai/testing-review.md` if you discover that an existing test should be reclassified

If a current test disagrees with Home Assistant docs, fix the implementation first unless the test itself is proven wrong.

## Auth, Transport, And Runtime Rules

When the change touches runtime or transport behavior, verify it against real Home Assistant contracts for:

- REST behavior
- WebSocket auth flow
- custom panel behavior
- add-on ingress behavior
- standalone OAuth or session behavior

## Relevant Repo Areas

- Runtime and transport: `src/app/infrastructure/home-assistant/`
- Auth adapters: `src/auth/`
- Home Assistant services: `src/app/services/`
- Existing fixtures: `src/test/fixtures/home-assistant/`
- Existing contract docs: `docs/agents/home-assistant-contract-testing.md`
- Coverage plan and domain priorities: `docs/testing/home-assistant-integration-coverage.md`
