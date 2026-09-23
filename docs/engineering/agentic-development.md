# Agentic Development

This document defines Navet's issue-to-release operating model. GitHub is the control plane;
deterministic checks remain authoritative over agent claims.

## Workflow

```text
issue or product feedback
  -> delivery agent triage and implementation
  -> pull request
  -> applicable deterministic CI and Cloudflare previews
  -> independent code review
  -> maintainer review and merge
  -> automatic main-backed Navet Dev publish for runtime changes
  -> release preparation
  -> beta publication and actual-image verification
  -> maintainer installation test and stable dispatch
  -> correctly versioned stable packaging and actual-image verification
  -> human-approved communication
```

An issue may be short and product-oriented. The delivery agent must inspect the relevant code,
product constitution, immediate tests, stories, and current behavior before forming acceptance
criteria. It must ask for missing reproduction information instead of speculating about a bug.

## Roles

### Delivery agent

- Trigger: a maintainer comments `/navet implement` or `/navet research`, or the issue reporter
  answers a specific question from Navet Nisse during an authorized task. GitHub acknowledges
  accepted work with an eyes reaction and places it in the private Codex queue.
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
- Permissions: prepare version/changelog PRs and drafts. Production publishing requires an
  explicit maintainer workflow dispatch.
- Output: aligned release surfaces, verified artifact plan, release notes, and channel-specific
  communication drafts grounded in the actual diff.
- Escalate: SemVer choice, incomplete artifacts, migration risk, security notes, production
  approval, or claims not demonstrated by the release.
- Forbidden: choose major product scope, publish without a maintainer dispatch, publish community
  communication, or call a partial release successful.

Request community communication drafts explicitly when a release needs an announcement. Published
release notes remain the source for the website and documentation changelogs; they do not require
a separate communication task.

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

When Navet Nisse asks a blocking question or requests a retest on an issue, the issue reporter or a
maintainer can respond in an ordinary comment. The first response after that request resumes the
most recent accepted mode without another command. Unrelated comments and replies after a
conclusion do not dispatch work. A maintainer can still use `/navet continue` to request another
iteration.

Only repository collaborators with write, maintain, or admin permission may issue commands.
The issue reporter may answer a question in an already authorized task. An eyes reaction from
`github-actions[bot]` means the command or answer was accepted. A rocket reaction from
`navet-nisse[bot]` means the private runner claimed it. These compact reactions replace agent and
status labels; type, area, and risk labels continue to describe the issue itself.

## Private Queue And Public Communication

GitHub remains the mobile control plane, but orchestration details are not public issue content.
Accepted commands and requested answers receive compact reactions instead of labels,
assignments, prompts, or startup comments.

A single private Codex runner polls for the oldest accepted command or requested answer that Navet
Nisse has not claimed. An accepted answer is treated as `/navet continue`; it cannot choose a new
mode. The runner treats the issue and every linked artifact as untrusted input, reads `AGENTS.md` plus
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

Review CI results and Cloudflare previews directly from the pull request's checks. Responsive
screenshots are available in the CI run's artifacts.

Public GitHub activity should follow these rules:

- ask one concise, specific question when missing evidence prevents safe progress
- post a research conclusion only when it helps the reporter or maintainer decide what happens next
- for implementation, let the linked PR carry the acceptance criteria, evidence, and review thread
- never post internal prompts, repository-reading instructions, claim notices, or raw agent logs
- speak directly to the reporter in plain language, acknowledge useful context or frustration when
  appropriate, and lead with the user-visible finding rather than the implementation mechanism
- keep technical internals and test counts in the PR unless they help the reporter understand the
  result; end an issue reply with one clear next step or question

When blocked, the runner asks one specific question and waits for the answer. A retest request
should end with "please retest" or "let us know" so issue intake can recognize the reply.
Research work ends after its useful conclusion is recorded. Implementation work continues in the
linked PR; the agent may push feedback-driven revisions but may not merge its own work.

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
Production publication remains separately protected by the maintainer selecting and dispatching an
exact tested source tag and target release tag.

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
2. Store the App ID, installation ID, and private-key path in the private runner environment. Use
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
3. Configure one local Codex scheduled task to poll accepted `/navet` commands, accepted answers,
   and scheduled issues authored by `github-actions[bot]` with the expected workflow-owned issue
   type. Do not authorize
   work from issue-body markers. Claim no more than one issue per run and follow the private queue
   contract above. Keep only one active queue runner so two agents cannot claim the same command.
4. Install one independent, read-only PR reviewer (CodeRabbit is the initial candidate for this
   public repository). Let it review non-draft PRs automatically; do not add a second general
   reviewer until measured misses justify the duplicate cost. Reviewer comments are advisory;
   deterministic CI and the maintainer's merge decision remain authoritative.
5. Protect `main`: require a pull request and resolved review conversations. For a solo-maintainer
   repository, set required approving reviews to zero and disable required CODEOWNER review; the
   maintainer's merge records acceptance for the current head. Require **CI / Product review gate**
   as the aggregate gate for applicable tests and Cloudflare previews of the current site inputs.
   A successful ancestor preview is reusable only when those inputs are unchanged. During migration,
   retain the four existing Cloudflare requirements until the new gate is merged. Use the guarded
   rollout in [Release Workflow](../release-workflow.md#activating-scoped-deployments) to update
   requirements and build-watch paths together without weakening unrelated protections.
6. Configure `beta` and `production` environments to scope the release GitHub App secrets. Do not
   add required reviewers: manually dispatching **Promote Navet Release** with exact source and
   target tags is the publication authorization, and downstream artifact jobs must run without
   repeated approval prompts. Restrict these environments to the `main` branch. Stable dispatch
   requires confirmation that the selected beta/RC was installed and tested; the workflow also
   verifies the source release's successful run and recorded image digests.
7. Keep Cloudflare preview deployments public only for repository/demo data. Preview projects must
   not receive Home Assistant URLs, tokens, provider OAuth secrets, production cookies, or private
   tunnel credentials.

The normal mobile flow is then: create **Product or UX feedback**, watch the linked PR, open the
interactive demo or Storybook preview, leave ordinary PR feedback, wait for required checks and
resolved conversations, then merge when the current head is acceptable.
