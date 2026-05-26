# Home Assistant contract testing policy

## Non-negotiable rule

Home Assistant is the source of truth for integration behavior.

Navet’s current implementation is not a valid source of truth for tests.

A test that only proves Navet behaves like Navet is low-value and should be rewritten or removed.

## Test source of truth

Tests for Home Assistant behavior must be based on one or more of:

1. Official Home Assistant documentation
2. Home Assistant WebSocket API behavior
3. Home Assistant REST API behavior
4. Home Assistant authentication behavior
5. Home Assistant add-on / ingress behavior
6. Home Assistant custom panel behavior
7. Realistic Home Assistant state objects
8. Real user-reported regressions
9. Explicit Navet product requirements

## Forbidden test behavior

Do not write or update tests by doing any of the following:

- Reading Navet’s current implementation and asserting that behavior.
- Changing test expectations only because implementation changed.
- Creating fake Home Assistant payloads that do not look like real Home Assistant data.
- Mocking Navet internals so heavily that Home Assistant behavior is no longer tested.
- Removing a failing test just because the implementation does not satisfy it.
- Asserting private implementation details unless they encode a Home Assistant contract.

## Required test behavior

Tests must verify user-visible or contract-visible behavior.

Prefer tests that answer:

- Does Navet correctly handle real Home Assistant entity state objects?
- Does Navet behave correctly under standalone Docker mode?
- Does Navet behave correctly under Home Assistant add-on / ingress mode?
- Does Navet behave correctly under HACS custom panel mode?
- Does Navet handle authentication failure safely?
- Does Navet handle unavailable, unknown, missing, or malformed entity data?
- Does Navet correctly resolve Home Assistant resource URLs?
- Does Navet avoid leaking tokens in URLs?
- Does Navet show useful fallback UI when resources fail?

## Existing test audit rule

Before modifying existing tests, classify each test as:

### Keep

The test verifies:

- documented Home Assistant behavior
- realistic Home Assistant payload behavior
- a known regression
- important user-visible behavior

### Rewrite

The test idea is useful, but:

- it is based on implementation details
- mock data is unrealistic
- assertions are too shallow
- it over-mocks Navet internals

### Remove

The test:

- only verifies that a mocked function was called
- mirrors current implementation
- asserts arbitrary private state
- uses impossible Home Assistant data
- creates false confidence

## Fixture rules

Home Assistant fixtures must look like real Home Assistant data.

State objects should generally include:

```ts
{
  entity_id: "domain.name",
  state: "on",
  attributes: {},
  last_changed: "2026-01-01T10:00:00.000Z",
  last_updated: "2026-01-01T10:00:00.000Z",
  context: {
    id: "context-id",
    parent_id: null,
    user_id: null
  }
}