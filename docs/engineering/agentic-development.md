# Agentic Development

This document defines Navet's issue-to-release operating model. GitHub is the control plane;
deterministic checks remain authoritative over agent claims.

## Workflow

```text
issue or product feedback
  -> delivery agent triage and implementation
  -> pull request
  -> deterministic CI and Cloudflare previews
  -> independent code review
  -> maintainer product review for UI changes
  -> merge
  -> optional Navet Dev publish
  -> release preparation
  -> production environment approval
  -> artifact verification
  -> human-approved communication
```

An issue may be short and product-oriented. The delivery agent must inspect the relevant code,
product constitution, immediate tests, stories, and current behavior before forming acceptance
criteria. It must ask for missing reproduction information instead of speculating about a bug.

## Roles

### Delivery agent

- Trigger: `agent:implement` or `agent:research` on an issue.
- Inputs: issue history, root and scoped agent instructions, product constitution, changed-area
  guide, current code, tests, stories, and linked evidence.
- Permissions: read repository and issues; create a branch and pull request; edit only the task
  scope; never access production or private Home Assistant credentials.
- Output: explicit acceptance criteria, implementation or research result, tests, documentation
  impact decision, and a PR linked to the issue.
- Required behavior: reproduce bugs before fixing; add a regression test when practical; run
  targeted checks; let CI determine readiness.
- Escalate: ambiguous product behavior, unreproducible bugs, foundational-rule changes, breaking
  architecture, credentials, destructive migrations, or provider behavior not supported by
  official evidence.
- Forbidden: merge, approve its own work, change foundational principles to fit a solution, weaken
  tests, publish, or report success with a failing deterministic gate.

### Independent reviewer

- Trigger: non-draft PR after CI begins.
- Inputs: issue and acceptance criteria, diff, relevant constitution and architecture files, test
  evidence, and preview links.
- Permissions: read and comment only.
- Output: findings ranked by impact; explicit statement when no blocking finding remains.
- Escalate: product ambiguity, security-sensitive behavior, provider-contract drift, persistence
  risk, or insufficient evidence.
- Forbidden: silently patch the implementation, approve product taste, or treat implementation
  agent explanations as proof.

### Steward

- Trigger: monthly scheduled issue or maintainer dispatch.
- Inputs: merged PRs and releases since the previous review, `README.md`, `AGENTS.md`, product,
  architecture, engineering, provider, design-system, and release documentation.
- Permissions: open issues and documentation PRs only.
- Output: verified drift report and narrowly scoped documentation changes.
- Escalate: any proposed change to product principles, dashboard principles, foundational
  architecture, provider status, or release authority.
- Forbidden: silently rewrite philosophy or change runtime behavior while "fixing docs."

### Release coordinator

- Trigger: explicit release-preparation issue or workflow dispatch.
- Inputs: complete range since the previous stable tag, release-managed surfaces, CI results,
  artifacts, previews, and approved screenshots.
- Permissions: prepare version/changelog PRs and drafts. Production publishing is environment-gated.
- Output: aligned release surfaces, verified artifact plan, release notes, and channel-specific
  communication drafts grounded in the actual diff.
- Escalate: SemVer choice, incomplete artifacts, migration risk, security notes, production
  approval, or claims not demonstrated by the release.
- Forbidden: choose major product scope, bypass the production environment, publish community
  communication, or call a partial release successful.

QA is not a separate conversational agent. Linting, type checking, tests, builds, smoke checks,
screenshots, and artifact verification are deterministic jobs. A reviewer may interpret failures;
it may not override them.

The current required UI lane builds Storybook and runs responsive demo smoke/accessibility checks.
The complete Storybook browser interaction suite has known baseline failures and remains a visible
local diagnostic until those assertions are repaired. It must not be represented as a passing gate
or made required while `main` is red.

## Labels And State

- `agent:research`: investigate and report; no implementation is assumed.
- `agent:implement`: triage, implement when requirements are clear, and open a PR.
- `status: needs-triage`: request has not been accepted for agent work.
- `status: needs-context`: progress requires specific user or maintainer information.
- `status: agent-working`: a delivery agent owns the current iteration.
- `status: product-review`: CI and preview evidence are ready for maintainer review.
- `review: product-approved`: current PR head was reviewed for UX; a new commit removes it.
- `review: foundation-approved`: foundational product or architecture changes were approved.
- `review: security-approved`: security-sensitive changes received maintainer review.

Use type, area, and risk labels to describe work; do not encode every transition as a new agent.

## Human Approval

Autonomous work may research, plan, implement, test, review, analyze documentation impact, deploy
ephemeral previews, prepare Navet Dev artifacts, and draft release communication.

Maintainer approval is required for:

- product and UX acceptance of UI changes
- foundational product, design, dashboard, and architecture rules
- explicitly security-sensitive or breaking architecture changes
- production releases
- public communication
- access to a private Home Assistant installation or its credentials

UI approval uses the exact `/approve-product <full-current-head-sha>` command shown in the PR review
summary. Foundation and security approvals use the corresponding SHA-bound commands shown there.
The workflow rejects an approval when that reviewed commit is no longer the PR head, then records
accepted approval as a commit status on that SHA. Labels are only a mobile-visible indicator. A new
commit has no matching status, so feedback-driven agent iterations must be reviewed again even if
label cleanup is delayed.

## Cost And Context

- run cheap deterministic classification and focused checks before expensive AI review
- load the root guide plus only the routed area guide and directly relevant constitution pages
- use changed paths and issue labels to scope reviewers
- do not run multiple general-purpose reviewers unless measured misses justify the duplication
- reuse CI results and preview artifacts rather than asking each agent to rebuild independently

## One-time Repository Setup

Repository files define the workflow, but the following live GitHub and Cloudflare settings must be
configured after these files reach `main`:

1. Run **Sync Repository Labels** once. It creates or updates managed labels without deleting
   community labels.
2. Set `NAVET_CODING_AGENT_LOGIN` to the installed coding agent's GitHub login. The agent app should
   receive issue, branch, and pull-request access but no Actions secrets, environment approval,
   package deletion, administration, or private-network access.
3. Install one independent, read-only PR reviewer (CodeRabbit is the initial candidate for this
   public repository). Let it review non-draft PRs automatically; do not add a second general
   reviewer until measured misses justify the duplicate cost. Reviewer comments are advisory;
   deterministic CI and the explicit human gates remain authoritative.
4. Optionally set `NAVET_PRODUCT_APPROVER` when the approving account differs from the repository
   owner.
5. Protect `main`: require a pull request, dismiss stale approvals, require CODEOWNERS where
   applicable, and require **CI / Product review gate** plus **Human Approval Gates / Current head
   approvals**. Require the currently configured Cloudflare Pages preview check. Add demo,
   Storybook, and documentation preview checks to branch protection only after those projects are
   connected to GitHub and have reported successfully on a pull request.
6. Configure the `production` environment with the maintainer as a required reviewer and prevent
   administrators from bypassing it. Keep `edge` autonomous and `beta` approval-gated until its
   artifact history is proven reliable.
7. Keep Cloudflare preview deployments public only for repository/demo data. Preview projects must
   not receive Home Assistant URLs, tokens, provider OAuth secrets, production cookies, or private
   tunnel credentials.

The normal mobile flow is then: create **Product or UX feedback**, watch the linked PR, open the
interactive demo or Storybook preview, leave ordinary PR feedback, and comment `/approve-product`
with the full commit SHA copied from the PR review summary when the current head is acceptable.
