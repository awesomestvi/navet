# Testing Architecture

Read this file before creating, modifying, deleting, or reviewing tests.

## Core Rules

- do not update tests only to make them pass
- delete or rewrite tests that only mirror implementation details
- keep tests that verify documented behavior, user-visible behavior, realistic payload handling, or
  known regressions
- use Navet-owned contracts for shared-surface tests unless the code under test is explicitly
  adapter-internal

## Test Classification

Classify existing tests before editing them:

- `Keep`
- `Rewrite`
- `Delete`

Use `ai/testing-review.md` as the audit baseline when it already covers the file.

## Fixture Rules

- prefer shared fixtures under `src/test/fixtures/home-assistant/`
- prefer realistic provider payloads over hand-shaped inline objects
- cover `unknown`, `unavailable`, missing fields, malformed-but-plausible fields, and runtime/path
  edge cases when they matter

## Routing

Also read:

- `docs/agents/testing.md`
- `docs/testing/home-assistant-contract-testing.md` for Home Assistant-facing tests
