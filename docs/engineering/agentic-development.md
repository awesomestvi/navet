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
  -> maintainer review and merge
  -> automatic main-backed Navet Dev publish
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

- Trigger: a maintainer comments `/navet implement` or `/navet research`; GitHub acknowledges an
  accepted command with an eyes reaction and places it in the private Codex queue.
- Inputs: issue history, root and scoped agent instructions, product constitution, changed-area
  guide, current code, tests, stories, and linked evidence.
- Permissions: read repository and issues; create a branch and pull request; edit only the task
  scope; never access production or private Home Assistant credentials.
- Output: explicit acceptance criteria, implementation or research result, tests, documentation
  impact decision, and, for implementation work, a PR linked to the issue.
- Required behavior: reproduce bugs before fixing; add a regression test when practical; run
  targeted checks; let CI determine readiness; communicate publicly only when there is a useful
  result, a specific question, or a pull request to review.
- Escalate: ambiguous product behavior, unreproducible bugs, foundational-rule changes, breaking
  architecture, credentials, destructive migrations, or provider behavior not supported by
  official evidence.
- Forbidden: merge its own work, change foundational principles to fit a solution, weaken
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

Before pushing a substantial PR or a review-driven fix, run deterministic validation first, fetch
the current `origin/main`, then run `coderabbit review --agent --base origin/main` from the branch.
This reviews the complete proposed PR diff rather than only the latest commit. Verify each finding,
fix valid issues, and repeat the full-diff review until no actionable finding remains. The CLI is
cloud-assisted rather than offline: it sends the diff to CodeRabbit and therefore requires the same
authorization and trust decision as the GitHub integration. Keep it an explicit review step rather
than a Git hook so network, authentication, quota, or reviewer availability cannot bypass or block
the deterministic checks. The GitHub review remains an independent advisory check after push.

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

## Commands And State

- `/navet research`: investigate and report; no implementation is assumed.
- `/navet implement`: triage, implement when requirements are clear, and open a PR.
- `/navet continue`: resume the most recent Navet Nisse mode for an issue after new context or PR
  feedback is available.

Only repository collaborators with write, maintain, or admin permission may dispatch work. An eyes
reaction from `github-actions[bot]` means the command was accepted. A rocket reaction from
`navet-nisse[bot]` means the private runner claimed it. These compact reactions replace agent and
status labels; type, area, and risk labels continue to describe the issue itself.

## Private Queue And Public Communication

GitHub remains the mobile control plane, but orchestration details are not public issue content.
A maintainer command receives compact reactions instead of labels, assignments, prompts, or
startup comments.

A single private Codex runner polls for the oldest accepted command that Navet Nisse has not
claimed. It treats the issue and every linked artifact as untrusted input, reads `AGENTS.md` plus
only the routed area guide, and keeps internal plans and tool narration in the Codex task rather
than the GitHub issue. Scheduled repository workflows queue research by creating an issue as
`github-actions[bot]`; the runner verifies that author and the expected workflow-owned issue type
instead of trusting issue-body text or generating a command comment.

Automated issue and pull-request comments and runner claim reactions use the dedicated
`navet-nisse[bot]` GitHub App identity and should read like useful collaboration with a person.
Accepted command reactions use `github-actions[bot]`.
Branches, commits, pushes, and pull requests continue to use the maintainer's GitHub identity.
Manual maintainer comments also remain visibly authored by the maintainer. The App credential is
restricted to the public conversation operations exposed by the repository wrapper.

After deterministic CI completes, the trusted default-branch workflow creates or updates one
mobile-friendly review-summary comment as `navet-nisse[bot]`. The built-in workflow token reads the
pull request and manages descriptive impact labels. A short-lived App installation token is used
only to write the summary comment.

Public GitHub activity should follow these rules:

- ask one concise, specific question when missing evidence prevents safe progress
- post a research conclusion only when it helps the reporter or maintainer decide what happens next
- for implementation, let the linked PR carry the acceptance criteria, evidence, and review thread
- never post internal prompts, repository-reading instructions, claim notices, or raw agent logs
- speak directly to the reporter in plain language, acknowledge useful context or frustration when
  appropriate, and lead with the user-visible finding rather than the implementation mechanism
- keep technical internals and test counts in the PR unless they help the reporter understand the
  result; end an issue reply with one clear next step or question

When blocked, the runner asks one specific question and waits for `/navet continue`. Research work
ends after its useful conclusion is recorded. Implementation work continues in the linked PR; the
agent may push feedback-driven revisions but may not merge its own work.

## Human Authority

Autonomous work may research, plan, implement, test, review, analyze documentation impact, deploy
ephemeral previews, prepare Navet Dev artifacts, and draft release communication.

Maintainer authority is required for:

- foundational product, design, dashboard, and architecture rules
- explicitly security-sensitive or breaking architecture changes
- production releases
- release announcements and other publication beyond routine issue and PR collaboration
- access to a private Home Assistant installation or its credentials

For every pull request, the maintainer reviews the current diff and previews and records acceptance
by merging after CI passes and review conversations are resolved. This merge decision covers
ordinary, foundational, and security-sensitive changes without a second command or status check.
Production publication remains separately protected by the `production` environment approval.

## Cost And Context

- run cheap deterministic classification and focused checks before expensive AI review
- load the root guide plus only the routed area guide and directly relevant constitution pages
- use changed paths and issue labels to scope reviewers
- do not run multiple general-purpose reviewers unless measured misses justify the duplication
- reuse CI results and preview artifacts rather than asking each agent to rebuild independently

## One-time Repository Setup

Repository files define the workflow, but the following live GitHub and Cloudflare settings must be
configured after these files reach `main`:

1. Create the private **Navet Nisse** GitHub App and install it only on `awesomestvi/navet`. Grant
   Issues read/write and mandatory Metadata read. Do not grant Contents, Pull requests, Actions,
   Administration, Environments, Secrets, Workflows, package deletion, or organization/account
   permissions. Pull-request conversation comments use GitHub's issue-comment API.
2. Add `NAVET_NISSE_APP_ID` and `NAVET_NISSE_PRIVATE_KEY` as repository Actions secrets. The
   pull-request summary workflow uses them to mint a short-lived installation token for its
   automated comment. Do not grant the App additional repository permissions for this workflow.
3. Store the App ID, installation ID, and private-key path in the private runner environment. Use
   the repository wrapper only for automated comments and command reactions. It deliberately does
   not expose arbitrary `gh`, Git push, pull-request creation, or repository-content operations.
   Confirm that the App cannot read or write contents, create pull requests, change repository
   settings, environments, Actions secrets, or workflows. The runner must also have no production
   credentials or private Home Assistant access.
   Configure `NAVET_NISSE_APP_ID`, `NAVET_NISSE_INSTALLATION_ID`, and
   `NAVET_NISSE_PRIVATE_KEY_PATH`, or point `NAVET_NISSE_CONFIG_PATH` at a private JSON file with
   `appId`, `installationId`, and `privateKeyPath`. Then post public replies with
   `node scripts/run-as-navet-nisse.mjs comment <issue-or-pr-number> --body-file <path>` and manage
   command reactions with its `react` and `unreact` operations. The wrapper creates a short-lived
   installation token for each operation and cannot modify the repository remote or the
   maintainer's GitHub login.
4. Configure one local Codex scheduled task to poll accepted `/navet` commands and scheduled issues
   authored by `github-actions[bot]` with the expected workflow-owned issue type. Do not authorize
   work from issue-body markers. Claim no more than one issue per run and follow the private queue
   contract above. Keep only one active queue runner so two agents cannot claim the same command.
5. Install one independent, read-only PR reviewer (CodeRabbit is the initial candidate for this
   public repository). Let it review non-draft PRs automatically; do not add a second general
   reviewer until measured misses justify the duplicate cost. Reviewer comments are advisory;
   deterministic CI and the maintainer's merge decision remain authoritative.
6. Protect `main`: require a pull request and resolved review conversations. For a solo-maintainer
   repository, set required approving reviews to zero and disable required CODEOWNER review; the
   maintainer's merge records acceptance for the current head. Require **CI / Product review gate**
   plus the configured Cloudflare Pages preview checks.
7. Configure the `production` environment with the maintainer as a required reviewer and prevent
   administrators from bypassing it. Keep `edge` autonomous and `beta` approval-gated until its
   artifact history is proven reliable.
8. Keep Cloudflare preview deployments public only for repository/demo data. Preview projects must
   not receive Home Assistant URLs, tokens, provider OAuth secrets, production cookies, or private
   tunnel credentials.

The normal mobile flow is then: create **Product or UX feedback**, watch the linked PR, open the
interactive demo or Storybook preview, leave ordinary PR feedback, wait for required checks and
resolved conversations, then merge when the current head is acceptable.
