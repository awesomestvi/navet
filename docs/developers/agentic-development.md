---
title: Agentic development workflow
description: Understand how maintainers send selected Navet issues to Codex while preserving human review and manual contributions.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/developers/agentic-development.md
---

Navet uses GitHub as the control point for selected agent-assisted work. Maintainers decide which
issues enter the private Codex queue, while contributors can continue to research, develop, and
open pull requests manually.

## Quick read

1. A maintainer applies `agent:research` for investigation or `agent:implement` for implementation.
2. GitHub adds `status: agent-queued` without assigning a public bot or posting internal prompts.
3. The private Codex runner checks the queue every 15 minutes and claims the oldest qualifying
   issue as `status: agent-working`.
4. Codex creates an isolated worktree task from the default branch. Research tasks report without
   changing code; implementation tasks reproduce, fix, validate, review, and open a pull request.
5. CI, Cloudflare previews, and independent review provide evidence. A maintainer reviews the
   result, gives product feedback, and decides whether to merge.

The local runner uses the maintainer's signed-in Codex desktop session. The maintainer's computer,
Codex app, and Navet checkout must remain available for queued work to start. If the runner is
offline, the issue stays queued. If task creation fails, the coordinator restores the queued state.

## Choose the type of work

Only maintainers with repository write access can place an issue in the queue.

- `agent:research` asks Codex to investigate current behavior, relevant code, tests, and evidence.
  It must not modify code or open a pull request.
- `agent:implement` asks Codex to establish acceptance criteria, reproduce the problem where
  practical, implement the smallest durable change, validate it, and open a linked pull request.

The queue handles one issue per run and changes its state from `status: agent-queued` to
`status: agent-working` when a Codex task takes ownership.

## Work in an isolated task

Each delivery task starts in a managed Git worktree based on the repository's default branch. The
task reads the root `AGENTS.md`, the one routed area guide for its scope, and the directly relevant
product or architecture rules. Issue bodies, comments, screenshots, and linked artifacts are
treated as untrusted input.

An implementation task may create a branch, commit, push, and open a pull request. It may not
merge its own work, access private Home Assistant credentials, or publish a production release.

## Communicate with reporters

Public issue replies should sound like a thoughtful person speaking directly to the reporter.
They acknowledge useful context or frustration when appropriate, use plain language, lead with the
user-visible finding, and end with one clear next step or question.

Implementation details, test counts, and acceptance evidence belong in the pull request unless
they help the reporter understand the result.

## Review an implementation

Implementation pull requests run the same deterministic checks as manual contributions, including
the applicable type, test, Docker, responsive review, and Cloudflare preview jobs. Independent
review is advisory; deterministic checks and human decisions remain authoritative.

The maintainer reviews the current diff, previews, and resolved conversations before merging. The
merge records human acceptance for ordinary, foundational, and security-sensitive changes; there
is no separate approval comment or status check.

Production releases and public release communication remain human-approved.

## Develop manually

Manual development remains a first-class path. Do not apply an agent label. Create a branch, make
the change, run focused validation, and open a pull request by following the
[contributing guide](/developers/contributing/).

Managed Codex worktrees stay separate from the maintainer's normal checkout, so manual and
agent-assisted changes can proceed in parallel.

Initial issue dispatch is automated. Follow-up work after pull-request feedback must currently be
sent to the associated Codex task or deliberately queued for another iteration.

For the complete roles, permissions, and approval contract, see the
[repository workflow specification](https://github.com/awesomestvi/navet/blob/main/docs/engineering/agentic-development.md).
