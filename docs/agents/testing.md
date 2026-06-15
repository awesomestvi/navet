# Testing

Use this file as the short workflow guide for test work. The deeper strategy lives in
[../testing/provider-testing-strategy.md](../testing/provider-testing-strategy.md).

## Core Rules

- do not weaken valid tests to match implementation drift
- do not rewrite tests only to make the suite pass
- prefer behavior, contract, and regression coverage over implementation-shaped assertions
- reuse shared fixtures instead of repeating inline mock builders
- keep test tiers honest

## Tier Model

Navet uses four test tiers:

- `Tier 1: Release-critical`
  Provider contracts, auth/runtime flows, resource/security-runtime edges, provider-boundary
  checks, and Docker validation.
- `Tier 2: Blocking app contracts`
  High-signal store, service, and adapter tests that protect stable app behavior.
- `Tier 3: Broad regression`
  Wider UI, hook, component, and feature coverage for drift detection.
- `Tier 4: Rewrite/Delete candidates`
  Weak, implementation-shaped, or already-audited rewrite/delete cases.

Workflow expectations:

- release and publish workflows depend on Tier 1 only
- main CI blocks on Tier 1 and Tier 2
- Tier 3 remains useful signal, but it is not a release prerequisite

## Source Of Truth

Ground tests in one or more of:

1. explicit product requirements
2. provider-neutral contracts
3. realistic provider payloads
4. official provider documentation
5. known regressions

Navet's current implementation is not the source of truth for those assertions.

## Fixture Rules

- use provider-neutral fixtures for shared-layer tests
- use realistic provider-specific fixtures for provider package tests
- include `unknown`, `unavailable`, missing fields, malformed-but-plausible fields, and
  resource-path differences when they matter

## Review Rules

Classify existing tests before editing them:

- keep
- rewrite
- delete

Use `ai/testing-review.md` when the file is already in the audit baseline.
Use [../testing/test-tier-inventory.md](../testing/test-tier-inventory.md) for the grouped tier map.
