# Testing Architecture

Read this file before creating, changing, deleting, or reviewing tests.

## Core Rules

- Delete or rewrite tests that only confirm Navet's current implementation.
- Keep tests that validate user-facing behavior, Home Assistant contracts, or real regressions.
- Never update tests only to make them pass.
- When a test fails, determine whether Navet is wrong, the mock data is wrong, or the expectation is wrong.
- Implementation-mirroring tests are low-value and should be removed unless they protect a real regression.
- If a test only proves that source code contains a string, it is presumed low-value until proven otherwise.

## Approved Test Sources

Tests must be grounded in at least one of:

- official Home Assistant documentation
- captured real-world Home Assistant payloads
- explicit product requirements
- documented regressions

If a test cannot be tied to one of those, treat it as untrusted.

## Required Workflow Before Editing A Test

1. Classify the test as `Keep`, `Rewrite`, or `Delete`.
2. Identify the source of truth for the assertion.
3. Check whether a shared fixture already exists in `src/test/fixtures/home-assistant/`.
4. Decide whether the failure is in Navet code, fixture data, or the test.
5. Only then edit the test.

## Required Coverage Shapes

Add or preserve coverage for:

- normal states
- `unavailable` states
- `unknown` states
- missing attributes
- partial attributes
- invalid or expired auth
- ingress and base-path behavior
- external resource URL handling

For Home Assistant-facing logic, a normal-state-only test is not enough.

## Test Classification

Organize and think about tests in these buckets:

- unit tests
- integration contract tests
- fixture validation tests
- UX behavior tests
- deployment and auth tests

## Rewrite And Delete Heuristics

Rewrite tests when:

- the behavior is worth keeping but the fixture is unrealistic
- the test asserts the right outcome for the wrong Home Assistant shape
- the scenario should be backed by Home Assistant docs before it is trusted
- the test uses inline synthetic payloads even though shared fixtures exist
- the test ignores `unknown`, `unavailable`, or missing-attribute behavior for a domain where those states matter

Delete tests when:

- they only mirror current implementation details
- they assert private internals rather than behavior
- they pass because the mocks were shaped to fit the code
- they provide no meaningful product confidence
- they inspect config or source files line-by-line instead of validating behavior

## What Not To Do

- Do not weaken expectations to match a failing implementation.
- Do not replace realistic fixtures with smaller fake objects just to make a test easier to write.
- Do not add snapshot-style tests over unstable normalized objects when a contract assertion would be clearer.
- Do not deep-mock internal hooks and stores when the contract can be tested at a boundary.
- Do not keep implementation-mirroring tests around "for coverage" if they block refactors while protecting nothing.

## Known Navet Failure Modes To Guard Against

- tests generated from current implementation instead of Home Assistant docs
- inline mocks that omit required Home Assistant fields and accidentally validate impossible states
- file-content tests that break on refactor but miss runtime bugs
- card or mapper tests that never exercise `unknown`, `unavailable`, partial, or malformed data
- auth and proxy tests that cover only one runtime mode

## Audit Routing

Before trusting or editing any existing test, check `ai/testing-review.md`.

If the test file is already listed there:

- preserve `Keep` tests unless you are strengthening them
- rewrite `Rewrite` tests against stronger fixtures or docs
- replace `Delete` tests with behavioral coverage instead of preserving their current shape

## Existing Repo Anchors

- Shared fixtures: `src/test/fixtures/home-assistant/`
- Test audit baseline: `ai/testing-review.md`
- Existing policy docs: `docs/agents/testing.md`, `docs/agents/home-assistant-contract-testing.md`
- Coverage matrix and gaps: `docs/testing/home-assistant-integration-coverage.md`
