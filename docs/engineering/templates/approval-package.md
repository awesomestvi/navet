# Maintainer Approval Package

Present one concise current-state review package for the authorized outcome. Keep confidential
planning material and household evidence in their approved storage. Public PRs receive only the
permitted delivery scope. Refresh the package after a new push.

## Result And Decision

Explain the user-visible result, selected option and requested maintainer decision. Link the approved
request/revision and acceptance criteria. State what remains incomplete or outside the verified scope.

## Review Snapshot

- Current full commit SHA, branch and PR:
- Actual preview URLs and the commit/build they represent:
- Relevant screenshots or recordings with viewport, theme, input mode and state:
- Changed behavior, compatibility/persistence impact and documentation:

Obtain preview links from the actual deployment/check result. A working preview from an older commit
is historical evidence, not current-head proof. Verify artifact access independently of its issue link.

## Acceptance Evidence

| Criterion | Scope and method | Current-head result and artifact | Remaining limit |
| --- | --- | --- | --- |
| Intended behavior | Reproduction or supported workflow | | |
| Deterministic checks | Applicable tests, typecheck, builds and runtime checks | | |
| Independent review | Exact reviewed head/diff and unresolved conversations | | |
| UI quality, if applicable | Primitives, direct consumers, states, viewports, themes and input modes | | |
| Documentation and compatibility | Verified instructions and affected persisted data | | |

Use pass, fail or unverified explicitly. State fixture, story and real-runtime coverage separately.
Do not call the package ready while required current-head checks, review or output verification are
pending or failing. Retain historical failures without presenting them as the current result.

## Maintainer Acceptance

Record the actor, accepted revision/head, decision, time and owning-service reference. For ordinary
PR delivery, acceptance is the maintainer's merge after checks and review conversations are resolved.
An agent-authored approval or private completion message is insufficient. Production releases and
publication require their existing separate maintainer authority.

After acceptance, verify the merged result and update the linked planning record. Leave unresolved
follow-up work visible with its owner and disposition; do not close the broader phase from one pilot.
