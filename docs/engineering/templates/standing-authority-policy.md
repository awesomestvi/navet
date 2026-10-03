# Standing Authority Proposal

Status: proposal template. This document does not activate a policy or expand existing authority.
Use it to record a concrete operating agreement for maintainer review. The product constitution,
architecture contracts and existing protected merge/release process retain their authority.

## Proposed Operating Scope

| Category | Proposed agent action | Decision boundary |
| --- | --- | --- |
| Direct maintainer implementation request | Investigate, implement, validate, repair review findings and prepare the requested outcome | Remain within the trusted request and existing repository rules |
| Agent-discovered maintenance | Reproduce, deduplicate and develop a scoped proposal | Automatic repair needs an explicitly accepted category, scope and limits |
| New product opportunity | Research household friction and develop options, workflow and design evidence | Selected option and implementation scope need human approval |
| Foundational, breaking or security-sensitive change | Investigate and prepare a reviewable proposal | Preserve existing maintainer authority; do not rewrite contracts to ease implementation |

Content production remains outside this builder rollout. Public delivery collaboration follows the
existing Nisse boundaries. Planning visibility is independent of implementation approval.

## Category Limits To Review

For each proposed automatic-maintenance category, record allowed paths/actions, exclusions, affected
users, evidence required before repair, maximum change size, validation and stop conditions. Examples
such as documentation drift or spacing defects are candidates, not pre-approved categories.

Record maximum concurrent deliveries, retries, elapsed time, cumulative model tokens and tool calls.
Define how the runner measures each unit, reserves uncertain work, checkpoints and stops execution.
Base numerical choices on observed pilot workloads. Missing numerical policy or live metering is an
unverified activation gate; local bookkeeping alone does not bound a running worker.

## Decision And Revocation Record

- Policy ID and revision:
- Selected categories and explicit exclusions:
- Numeric resource limits and measurement definition:
- Authorized planning/artifact destinations and public visibility:
- Maintainer actor, decision, time and trusted reference:
- Withdrawal/pause mechanism and unfinished-task recovery:

Verify the human decision through its owning service before dispatch, and recheck withdrawal and
scope changes. A connector can write as the maintainer account, so its account ID or an Approved
label is insufficient proof. Preserve the explicit trusted maintainer request path until automatic
approval provenance and revocation are verified. A paused or withdrawn policy cannot authorize new
execution; preserve checkpoints and expose the concrete decision needed to resume.

## Activation Evidence

Link the representative delivery pilots, recovery/duplicate tests, current-head gates, usable
approval packages, UX coverage and measured maintainer correction effort. Record accepted, failed
and unverified criteria separately. Activate only the accepted scope after its applicable delivery,
resource and quality gates are demonstrated. Keep unaccepted categories as proposals.
