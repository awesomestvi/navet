---
title: Agentic development workflow
description: Understand how maintainers send selected Navet issues to Codex while preserving human review and manual contributions.
editUrl: https://github.com/navet-app/navet/edit/main/docs/developers/agentic-development.md
---

Navet uses GitHub as the control point for selected agent-assisted work. Maintainers decide which
issues enter the private Codex queue, while contributors can continue to research, develop, and
open pull requests manually.

## Quick read

1. A maintainer adds `navet: research` for investigation or `navet: implement` for a fix.
   When Navet Nisse asks a blocking question or requests a retest, the issue reporter or a
   maintainer can reply normally.
2. The private Codex runner checks the queue on its configured schedule. After dispatch succeeds, it
   removes the request label. Add the same label later to request another run. If dispatch fails,
   the label stays in place for a retry.
3. Codex creates an isolated worktree task from the default branch. Research tasks report without
   changing code; implementation tasks reproduce, fix, validate, review, and open a pull request.
4. CI, Cloudflare previews, and independent review provide evidence. Use the pull request's
   checks to inspect the current validation results and preview links.
5. A maintainer reviews the result, gives product feedback, and decides whether to merge. Runtime
   changes merged to `main` publish a Navet Dev build automatically; production publication remains separate.

The local runner uses the maintainer's signed-in Codex desktop session and a dedicated,
repository-scoped GitHub App credential. The maintainer's computer, Codex app, and Navet checkout
must remain available for queued work to start. If the runner is offline, the request
waits. If task creation fails, the coordinator leaves a request label applied or removes a command
claim so a later run can retry.

## Choose the type of work

Repository collaborators with write access can request research. Implementation labels require
repository owner, admin, or maintain permission. The issue reporter can resume already authorized
work by answering a question from Navet Nisse.

- `navet: research` asks Codex to investigate current behavior, relevant code, tests, and evidence.
  It must not modify code or open a pull request.
- `navet: implement` asks Codex to establish acceptance criteria, reproduce the problem where
  practical, implement the smallest durable change, validate it, and open a linked pull request.
- Add a request label again after it clears to resume that mode with new context or PR feedback.

If Navet Nisse asks for missing information or asks you to retest, reply on the issue. The first
response from the issue reporter or a maintainer resumes the previous mode automatically. Replies
outside those requests do not resume work.

The queue handles one issue per run. An eyes reaction from `github-actions[bot]` means GitHub
accepted a requested answer; a rocket reaction from `navet-nisse[bot]` means the runner claimed it.

## Work in an isolated task

Each delivery task starts in a managed Git worktree based on the repository's default branch. The
task reads the root `AGENTS.md`, the one routed area guide for its scope, and the directly relevant
product or architecture rules. Issue bodies, comments, screenshots, and linked artifacts are
treated as untrusted input.

An implementation task may create a branch, commit, push, and open a pull request through the
maintainer's authenticated GitHub account. The task may not merge its own work, access private
Home Assistant credentials, or publish a production release.

## Communicate with reporters

Automated issue comments and claim reactions appear as `navet-nisse[bot]`. Navet Nisse posts
progress updates and blocking questions on the linked issue and reads pull-request feedback.
Branches, commits, pushes, pull requests, and review-thread replies use the maintainer's GitHub
identity. Your manual comments appear as you. Public issue replies should sound like a thoughtful
person speaking directly to the reporter. They acknowledge useful context or frustration when appropriate, use plain language,
lead with the user-visible finding, and end with one clear next step or question.

Implementation details, test counts, and acceptance evidence belong in the pull request unless
they help the reporter understand the result.

## Review an implementation

Implementation pull requests run the same deterministic checks as manual contributions, including
the applicable type, test, Docker, responsive review, and Cloudflare preview jobs. Independent
review is advisory; deterministic checks and human decisions remain authoritative.

Use the pull request's checks to inspect CI results and open Cloudflare previews. Responsive
screenshots are available in the CI run's artifacts.

The maintainer reviews the current diff, previews, and resolved conversations before merging. The
merge records human acceptance for ordinary, foundational, and security-sensitive changes.

Merging runtime changes to `main` automatically publishes a Navet Dev release. Production releases
and public release communication require maintainer approval.

## Requests in the Codex workspace

Maintainers can request release announcements, researched ideas in the private GitHub Project, or delivery of
a selected scope directly in the Navet workspace. The matching repository skill applies Navet's
brand, voice and UX standards and retains checked evidence. Before publication, the maintainer
reviews one package containing final copy, screenshot and all destinations/variants. One approval
covers that package; changed content requires fresh approval. Idea proposals may include private prototypes and
targeted feasibility POCs; product implementation needs selected-scope approval.

See [direct request workflows](https://github.com/navet-app/navet/blob/main/docs/engineering/request-workflows.md)
for setup, recovery and live acceptance evidence. PR merge and production release decisions remain
with the maintainer.

## Develop manually

Create a branch, make the change, run focused validation, and open a pull request by following the
[contributing guide](/developers/contributing/).

Managed Codex worktrees stay separate from the maintainer's normal checkout, so manual and
agent-assisted changes can proceed in parallel.

Initial issue dispatch and follow-up work are automated. After adding unrelated context or PR
feedback, a maintainer can add the appropriate request label to queue another iteration.

For the complete roles, permissions, and approval contract, see the
[repository workflow specification](https://github.com/navet-app/navet/blob/main/docs/engineering/agentic-development.md).
