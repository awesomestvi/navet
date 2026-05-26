# Home Assistant Contract Testing Policy

This file defines the mandatory policy for creating, modifying, deleting, and reviewing tests in Navet that touch Home Assistant behavior.

Read [testing.md](testing.md) first for the general test workflow. This file is the stricter source of truth for Home Assistant-facing test work.

## Core Rule

Home Assistant is the source of truth for integration tests.

Navet's current implementation is not the source of truth.

Do not change tests only to match implementation changes.

If a valid contract test fails, assume the implementation is wrong first and fix the implementation before changing the test.

Only change a test when it is proven wrong against one or more of the approved sources below.

## Approved Sources Of Truth

Use these in order:

1. Official Home Assistant documentation
2. Home Assistant REST, WebSocket, authentication, OAuth, panel, and ingress contracts
3. Realistic Home Assistant payloads and documented entity/state shapes
4. Known user-reported regressions
5. Explicit Navet product requirements

If a test cannot be tied to one of those sources, treat it as low-confidence until that connection is made.

## Required Documentation Baseline

Before working on Home Assistant-facing tests, read the relevant documentation first.

At minimum, use the applicable parts of:

- Home Assistant integrations index
- Home Assistant entity model and entity/domain documentation
- Home Assistant developer docs for entity platforms
- Home Assistant WebSocket API docs
- Home Assistant REST API docs
- Home Assistant authentication and OAuth docs
- Home Assistant ingress and add-on docs
- Home Assistant custom panel and frontend docs
- Individual integration docs when payload shape or media behavior differs materially

## Test Design Rules

- Do not trust the current Navet implementation as the behavioral reference.
- Do not write tests that only prove the current code behaves like itself.
- Every important test must map to documented Home Assistant behavior, a realistic Home Assistant payload, a known Navet integration mode, a reported regression, or an explicit product requirement.
- Prefer behavior and contract tests over shallow implementation tests.
- Avoid asserting private implementation details unless the helper itself encodes a Home Assistant contract.
- Mock Home Assistant at the boundary, not deep inside Navet internals.
- Prefer shared fixtures over repeated inline mock objects.
- Use realistic Home Assistant data, including missing fields, null values, `unknown`, `unavailable`, relative URLs, absolute URLs, authenticated URLs, external URLs, and malformed-but-plausible attributes.

## Failure Handling

When a test fails:

- Assume the implementation is wrong first.
- Compare the failing behavior against the approved sources of truth.
- Fix the implementation if the test matches Home Assistant's contract.
- Change the test only when the test is wrong against the contract, unrealistic, or disconnected from a real requirement.

Never weaken a valid contract test just to make the suite pass.

## Required Coverage Areas

Home Assistant-facing tests must cover the relevant contract areas for the code under change:

- Authentication modes
- WebSocket connection flow
- REST API behavior
- Entity state handling
- Camera feeds and media URLs
- Album artwork and media player images
- External resource URLs
- Ingress and add-on path behavior
- HACS custom panel behavior
- Local storage and session cleanup
- User-visible fallback and error states

## Authentication And Session Rules

Treat each supported Navet integration mode as a separate contract:

- standalone mode
- Home Assistant add-on / ingress mode
- Home Assistant custom panel mode
- OAuth flow, if implemented

Tests should cover invalid auth, expired auth, logout cleanup, back-to-login cleanup, and avoiding repeated invalid `/api/websocket` auth loops after failure.

## API Contract Rules

WebSocket tests should be based on documented Home Assistant flow, including:

- connect to `/api/websocket`
- receive `auth_required`
- send auth payload
- handle `auth_ok`
- handle `auth_invalid`
- subscribe to events
- fetch states
- reconnect behavior
- connection close behavior

REST tests should cover documented behavior for:

- `/api/states`
- authorization headers
- `401`, `403`, `404`, `500`
- network failure
- malformed JSON
- empty arrays
- slow responses and cancellation, where relevant

## Entity And Payload Rules

Use realistic Home Assistant state objects with:

- `entity_id`
- `state`
- `attributes`
- `last_changed`
- `last_updated`
- `context`

Cover relevant edge cases:

- `state: "unknown"`
- `state: "unavailable"`
- missing attributes
- null attributes
- unexpected attribute types
- device classes
- units of measurement
- friendly names
- localized or registry-provided names
- disappearing entities
- stale or duplicate data

## Resource URL Rules

Resource tests must cover the actual Home Assistant URL behavior relevant to Navet:

- relative Home Assistant URLs
- absolute Home Assistant URLs
- external integration-provided URLs
- authenticated resource URLs
- signed URLs
- ingress-prefixed paths
- panel same-origin behavior
- query strings and encoded characters
- URLs that should not be rewritten
- URLs that must be rewritten through Home Assistant
- broken image or stream fallback behavior
- avoiding token leakage in URLs

## Existing Test Audit Rules

When auditing or refactoring tests, classify them first:

### Keep

- user-visible behavior
- documented Home Assistant behavior
- real regressions
- stable Navet/Home Assistant contracts

### Rewrite

- good test idea, but implementation-shaped assertions
- unrealistic or sparse mock data
- missing important Home Assistant edge cases

### Remove

- only proves mocked call choreography
- mirrors current implementation without proving a contract
- asserts arbitrary internal state
- uses impossible or meaningless payloads
- gives false confidence

Do not delete useful user-flow tests blindly. Rewrite them against Home Assistant contracts and realistic fixtures where possible.

## Fixture Rules

- Prefer shared fixtures under `src/test/fixtures/home-assistant/`.
- Shared fixtures should model Home Assistant payloads, not Navet-normalized objects.
- Add variants for normal, unavailable, unknown, missing optional fields, malformed-but-plausible fields, relative URLs, ingress URLs, and external or signed URLs where relevant.
- Extend existing fixtures instead of duplicating payload builders inline.

## Review Rules

When reviewing Home Assistant-facing tests:

- reject tests derived only from Navet internals
- reject tests changed only to match implementation drift
- require a contract or regression justification for important assertions
- prefer stronger boundary tests over deeper mocking

If the implementation and the documented contract disagree, the documented contract wins unless Navet has an explicit product requirement that intentionally diverges.
