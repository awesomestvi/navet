# Agent Team Workflow Implementation Plan

Status: implementation requirements with a separate [infrastructure evidence ledger](agent-team-workflow.md#infrastructure-acceptance-ledger). Product ideas remain suggestions until selected;
this plan authorizes no product implementation, live experiment or unattended activation.

## Goal

Build a coordinated agent team that turns a maintainer's idea into researched options, a plan and
appropriate prototype evidence in the private Project. The maintainer prioritizes there and approves a ticket's
selected scope. The team implements approved work, tests and reviews it, opens one PR, and links
the result back to the private Project. Questions and verified answers stay in the originating draft history; authenticate decisions in the active Codex conversation.

This document defines the implementation scope for the core team workflow. The
[autonomous builder plan](autonomous-builder-plan.md) records a broader future programme. Its
design-system expansion, comparison experiments, recurring discovery, standing stewardship and
product-readiness programme require separate authorization. Retain a broader foundation only
when the core workflow directly depends on it; general usefulness is insufficient. Team workflow
acceptance remains separate from live operation and Navet 1.0.0 release acceptance.

## Maintainer Experience

```text
suggest an idea
  -> research + UX planning + appropriate prototype
  -> Ready for prioritization in the private Project
  -> maintainer chooses priority and approves selected scope
  -> specialist implementation + tests + independent review
  -> PR + preview + evidence linked to the private Project
  -> maintainer acceptance and merge
```

A material unanswered question is retained in draft history and asked in the active Codex conversation, with a waiting state. A verified answer
resumes the same work within its accepted scope. Priority and agent-written stage changes never
substitute for the maintainer's approval.

## Current infrastructure and live integration

The [team workflow](agent-team-workflow.md) maps existing intake, ownership, specialist, recovery,
accounting and completion contracts. The private Project reader supplies stable scope observations.
Private discovery uses an exact Project destination and verified maintainer idea request; approved
public delivery requires its separate visibility decision and authenticated exact-scope request.

Historical transport helpers preserve existing receipts and records. Project draft writes,
question/answer history, human provenance and unattended completion still need installed adapters
and a live pilot. The queue remains paused. Synthetic comparison experiments remain stopped;
retained partial outputs do not establish operational acceptance.

## Team Responsibilities

| Role | Deliverable |
| --- | --- |
| Coordinator | Ticket ownership, authorized scope, role assignments, durable progress, questions and coherent delivery |
| Researcher | Sources, existing coverage, observed problems, alternatives and evidence confidence |
| UX designer | User journeys, interaction/state design and proportional prototype evidence |
| Developer | Implementation using the owning modules and established contracts |
| Test specialist | Risk-based verification, user-flow results and reproducible failures |
| Security specialist | Relevant authorization, trust-boundary and data-handling findings |
| Architect | Provider ownership, integration, persistence and compatibility decisions |
| Independent reviewer | Current-head findings assessed separately from the builder |

Use specialists when the task needs their expertise. One coordinator owns the integrated outcome;
begin with one active ticket. Parallel assignments need independent responsibilities and explicit
file ownership. Each receives the ticket, relevant accepted scope, acceptance criteria, necessary
source references and prior evidence, rather than the entire conversation history.

## Implementation Sequence

### 1. Verify And Reuse Existing Foundations

Inspect the current branch, PR, task store and planning/dispatch/result adapters. Classify existing
modules as reusable, requiring integration, or requiring a scoped change. Verify callback ownership
and installed capabilities. Keep valid security boundaries and changes that implement this
workflow or are verified direct dependencies of it. Preserve unrelated changes and use one scoped reviewable delivery.

Deliverable: a current source map with concrete gaps and the narrow validation path for each change.

### 2. Add Private Proposal Development

Define discovery authority from the maintainer's idea request separately from implementation
approval. Support Captured/Developing proposal work that may research and produce review artifacts
in the authorized private Project. Reuse task ownership, recovery and deduplication while giving
private work an explicit destination. Preserve the public queue's visibility guard.

Use the [proposal template](templates/idea-proposal.md). Record evidence, options, recommended
scope, design/prototype references, implementation slices, risks, acceptance criteria and unknowns.
Publish a ready proposal only after verifying its destination and actual readback. Do not implement
a feature while developing its proposal.
An authorized idea request may include an isolated private feasibility POC to resolve a named
uncertainty. Keep it as proposal evidence; production integration requires selected-scope approval.

Verify stage handling, duplicate intake, scope withdrawal, private destination enforcement and
unavailable reads with focused deterministic cases. A fixture proves its contract, not live access.

### 3. Assemble The Specialist Coordinator

Connect intake, task state, specialist execution, worker lookup, evidence and checkpoints through
one runnable entry point. Define role inputs and outputs, dependency order and integration ownership.
Persist completed evidence and next actions so a restart resumes known work. Reconcile uncertain
worker creation before sending again. Run cheap configuration checks before model execution.

Deliverable: one documented invocation and an integrated deterministic execution fixture that
demonstrates the handoffs without claiming live operational acceptance.

### 4. Connect Ticket Approval And Conversation

Verify a maintainer approval for the exact selected proposal revision and delivery scope through
the owning trusted source. Keep human decisions distinguishable from agent writes. Bound and
recheck authority before dispatch; changes and withdrawal stop new execution.

Extend scoped Project draft updates to proposal findings, blocking questions, accepted answers, PR links
and delivery evidence. Preserve idempotent update identities and reconcile uncertain writes.
Waiting must not poll repeatedly or create replacement tasks. A response resumes existing work;
material scope changes require a revised decision.

Deliverable: ticket lifecycle integration with explicit awaiting-input and awaiting-review behavior.

### 5. Connect Implementation And Independent Acceptance

Approved work receives a [work brief](templates/work-brief.md). Developers implement its scope;
specialists assess relevant risks. Reuse Navet primitives, focused tests, actual previews and
current-head CI. UX/test review drives the running behavior; passing static checks alone cannot
establish interaction quality. The independent reviewer verifies findings at the current head.

Prepare one PR and the [approval package](templates/approval-package.md), then link them to the private Project.
Do not mark work Validated merely because a PR exists. Preserve the maintainer's merge and release
authority and separate feature acceptance from Navet 1.0.0 readiness.

### 6. Verify Live Operation When Authorized

Complete deterministic integration and source validation first. Live operation requires configured
identities, verified destination access, accepted resources and explicit authorization for the
chosen real ticket. Numerical limits must come from an accepted policy; prior experiment approvals
do not authorize new pilots. Do not infer an answer from elapsed time.

Start with one authorized real idea-to-proposal path, then its approved delivery. Measure actual
interventions, accepted outcomes, elapsed/waiting time and observed allowance. Preserve failed
evidence and checkpoints. Expand standing discovery or maintenance only after its own policy and
operational gates pass. The broader pilot and comparative evidence requirements belong to that
separately authorized programme; they do not expand core workflow acceptance.

## UI Quality Support

The team workflow includes a source-derived primitive and pattern catalog, composition recipes,
focused shared-UI import and shell checks, and a ticket-scoped rendered UX audit skill. These
support approved UI delivery and its existing acceptance evidence. Select checks according to the
changed surface and direct consumers; tool output alone does not establish visual acceptance.
Broader catalog classification, token tooling, Storybook MCP, comparative experiments and standing
policy remain part of the separately authorized future programme.

## Workflow Completion Evidence

Record passed, failed and unverified criteria against the actual source and owning-service receipts:

- A maintainer idea reaches a sourced, planned proposal with appropriate design evidence in the private Project.
- Proposal development performs no unapproved production implementation or public publication.
- Priority changes and agent-authored comments cannot trigger implementation approval.
- A verified approval starts the selected scope once; duplicates and restarts preserve ownership.
- Specialist assignments produce integrated deliverables and an independent assessment.
- A ticket question waits for input; a verified answer resumes the same task.
- Withdrawal, stale scope, unavailable access and exhausted resources prevent new work.
- Approved implementation reaches one PR, usable preview, truthful validation and the private Project links.
- Current-head changes invalidate dependent evidence; actual acceptance controls completion.
- Observed account usage and intervention are recorded without claiming unknown billing or effort.

Do not call unattended operation complete from mock adapters, configured tools or green unit tests.
Maintain a separate ledger for broader rollout requirements and product release acceptance.

## Execution Boundaries

Implement the workflow infrastructure, not the candidate product ideas. Keep related changes in one reviewable PR.
Keep the delivery scoped to this workflow and its verified direct dependencies. Do not activate
automation, start live model trials, raise limits, access private installations, merge or release without the applicable maintainer authorization. Stop
repeated unproductive work with a concrete diagnosis and checkpoint instead of automatic retries.
