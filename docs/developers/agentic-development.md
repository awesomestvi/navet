---
title: Agentic development workflow
description: Understand how maintainers send selected Navet issues to Codex while preserving human review and manual contributions.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/developers/agentic-development.md
---

Navet uses GitHub as the control point for selected agent-assisted work. Maintainers decide which
issues enter the private Codex queue, while contributors can continue to research, develop, and
open pull requests manually.

## Quick read

1. A maintainer adds `navet: research` for investigation or `navet: implement` for a fix.
   When Navet Nisse asks a blocking question or requests a retest, the issue reporter or a
   maintainer can reply normally.
2. The private Codex runner checks the queue every 15 minutes. After dispatch succeeds, it
   removes the request label. Add the same label later to request another run; you do not need
   to remove it first. If dispatch fails, the label stays in place for a retry.
3. Codex creates an isolated worktree task from the default branch. Research tasks report without
   changing code; implementation tasks reproduce, fix, validate, review, and open a pull request.
4. CI, Cloudflare previews, and independent review provide evidence. Navet Nisse maintains one
   pull-request summary with the current validation result and preview links.
5. A maintainer reviews the result, gives product feedback, and decides whether to merge. A merge
   to `main` publishes a Navet Dev build automatically; production publication remains separate.

The local runner uses the maintainer's signed-in Codex desktop session and a dedicated,
repository-scoped GitHub App credential. The maintainer's computer, Codex app, and Navet checkout
must remain available for queued work to start. If the runner is offline, the request
waits. If task creation fails, the coordinator leaves a request label applied or removes a command
claim so a later run can retry.

## Choose the type of work

Only maintainers with repository write access can start work on an issue. The issue reporter can
resume already authorized work by answering a question from Navet Nisse.

- `navet: research` asks Codex to investigate current behavior, relevant code, tests, and evidence.
  It must not modify code or open a pull request.
- `navet: implement` asks Codex to establish acceptance criteria, reproduce the problem where
  practical, implement the smallest durable change, validate it, and open a linked pull request.
- Add a request label again after it clears to resume that mode with new context or PR feedback.

If Navet Nisse asks for missing information or asks you to retest, reply on the issue. The first
response from the issue reporter or a maintainer resumes the previous mode automatically. Replies
outside those requests do not resume work.

The queue handles one issue per run. An eyes reaction from `github-actions[bot]` means GitHub
accepted a requested answer. For existing `/navet` commands, eyes still means accepted and a rocket
reaction from `navet-nisse[bot]` means claimed.

## Work in an isolated task

Each delivery task starts in a managed Git worktree based on the repository's default branch. The
task reads the root `AGENTS.md`, the one routed area guide for its scope, and the directly relevant
product or architecture rules. Issue bodies, comments, screenshots, and linked artifacts are
treated as untrusted input.

An implementation task may create a branch, commit, push, and open a pull request through the
maintainer's authenticated GitHub account. Navet Nisse does not own that Git activity. The task may
not merge its own work, access private Home Assistant credentials, or publish a production release.

## Communicate with reporters

Automated issue and pull-request comments appear as `navet-nisse[bot]`. Branches, commits, pushes,
and pull requests remain under the maintainer's GitHub identity, and your manual comments still
appear as you. Public issue replies should sound like a thoughtful person speaking directly to the
reporter. They acknowledge useful context or frustration when appropriate, use plain language,
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
merge records human acceptance for ordinary, foundational, and security-sensitive changes; there
is no separate approval comment or status check.

Merging to `main` automatically publishes a main-backed Navet Dev release. Production releases and
public release communication remain human-approved.

## Develop manually

Manual development remains a first-class path. Do not post a `/navet` command. Create a branch,
make the change, run focused validation, and open a pull request by following the
[contributing guide](/developers/contributing/).

Managed Codex worktrees stay separate from the maintainer's normal checkout, so manual and
agent-assisted changes can proceed in parallel.

Initial issue dispatch and follow-up work are automated. After adding unrelated context or PR
feedback, a maintainer can add the appropriate request label to queue another iteration.

For the complete roles, permissions, and approval contract, see the
[repository workflow specification](https://github.com/awesomestvi/navet/blob/main/docs/engineering/agentic-development.md).
