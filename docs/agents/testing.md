# Testing

This file defines the general testing workflow for Navet. For any Home Assistant-facing test work, also read [home-assistant-contract-testing.md](home-assistant-contract-testing.md).

## Mandatory Reading Rule

Before creating, modifying, deleting, or reviewing tests:

- Read [home-assistant-contract-testing.md](home-assistant-contract-testing.md) if the test touches Home Assistant behavior.
- Use that contract policy as the source of truth for Home Assistant integration behavior.

## Core Testing Rules

- Do not weaken a valid test just to make the suite pass.
- Do not rewrite tests only to match current implementation drift.
- If a valid contract test fails, assume the implementation is wrong first.
- Extend existing test files and `__tests__/` directories before creating duplicate coverage.
- Favor behavior and contract tests over shallow implementation tests.
- Reuse shared fixtures instead of repeating inline mock builders.

## Source Of Truth Rule

Tests that touch Home Assistant behavior must be grounded in one or more of:

1. Official Home Assistant documentation
2. Realistic Home Assistant payloads and documented entity or state shapes
3. Known regressions
4. Explicit product requirements

Navet's current implementation is not the source of truth for those tests.

## Review And Refactor Rules

- Classify existing tests before changing them: keep, rewrite, or remove.
- Keep tests that verify user-visible behavior, documented behavior, realistic payload handling, or known regressions.
- Rewrite tests that have a good purpose but are overly implementation-shaped, unrealistic, or under-specified.
- Remove tests that only mirror internals, use impossible payloads, or create false confidence.
- Do not delete useful user-flow coverage blindly; rewrite it against real contracts where possible.

## Fixture Rules

- Prefer shared fixtures over repeated inline objects.
- Fixtures for Home Assistant-facing tests should model Home Assistant payloads, not Navet-normalized objects.
- Include realistic edge cases when relevant: missing fields, nulls, `unknown`, `unavailable`, relative URLs, absolute URLs, ingress paths, external URLs, and malformed-but-plausible payloads.

## Related Guidance

- Full Home Assistant contract policy lives in [home-assistant-contract-testing.md](home-assistant-contract-testing.md).
- Storybook fixture and story ownership guidance lives in [storybook.md](storybook.md).
