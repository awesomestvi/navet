# Testing

This file defines Navet's general testing workflow.

For Home Assistant-facing tests, also read
[../testing/home-assistant-contract-testing.md](../testing/home-assistant-contract-testing.md).

## Core Rules

- do not weaken valid tests to match implementation drift
- do not rewrite tests only to make the suite pass
- prefer behavior, contract, and regression coverage over implementation-shaped assertions
- reuse shared fixtures instead of repeating inline mock builders

## Source Of Truth

Tests that touch Home Assistant behavior should be grounded in one or more of:

1. official Home Assistant documentation
2. realistic Home Assistant payloads
3. known regressions
4. explicit product requirements

Navet's current implementation is not the source of truth for those assertions.

## Fixture Rules

- use shared fixtures under `src/test/fixtures/home-assistant/` when possible
- include edge cases such as `unknown`, `unavailable`, missing fields, resource-path differences,
  and malformed-but-plausible payloads when relevant

## Review Rules

Classify existing tests before editing them:

- keep
- rewrite
- delete

Use `ai/testing-review.md` when the file is already part of the audit baseline.
