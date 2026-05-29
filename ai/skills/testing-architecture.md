# Testing Architecture

Read this file before creating, modifying, deleting, or reviewing tests.

## Core Rules

- do not update tests only to make them pass
- delete or rewrite tests that only mirror implementation details
- keep tests that verify documented behavior, user-visible behavior, realistic payload handling, or
  known regressions
- use Navet-owned contracts for shared-surface tests unless the code under test is explicitly
  adapter-internal
- respect the current tier split: Tier 1 for release-critical behavior, Tier 2 for blocking
  app-contract coverage, Tier 3 for broad regression, Tier 4 for rewrite/delete candidates

## Test Classification

Classify existing tests before editing them:

- `Keep`
- `Rewrite`
- `Delete`

Use `ai/testing-review.md` as the audit baseline when it already covers the file.
Use `docs/testing/test-tier-inventory.md` for the grouped tier map.

## Fixture Rules

- prefer provider-neutral fixtures for shared-layer tests
- prefer realistic provider-specific fixtures for provider package tests
- prefer realistic provider payloads over hand-shaped inline objects
- cover `unknown`, `unavailable`, missing fields, malformed-but-plausible fields, and runtime/path
  edge cases when they matter

## Routing

Also read:

- `docs/agents/testing.md`
- `docs/testing/provider-testing-strategy.md`
