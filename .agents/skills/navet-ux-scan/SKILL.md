---
name: navet-ux-scan
description: Run an on-demand Luna high scan of Navet code and user journeys for UX bugs and concrete improvements, with concise deduplicated GitHub Project findings. Use for discovery rather than implementation or PR acceptance.
---

# UX discovery scan

Run only when requested. Inspect and propose; product repairs require selected-scope approval.
Use `navet-idea-proposals` for GitHub Project destination verification, deduplication, proportional ticket
content and readback. Preserve its visibility and human decision boundaries.

## Assign the scanner

Delegate the inspection to one subagent with `model: gpt-6-luna`, `reasoning_effort: high` and
`fork_turns: none`. Supply the user's request, repository path, relevant scope and this skill path.
Tell the worker to read `AGENTS.md`, `ai/skills/navet-ux.md` and the relevant product principles;
then inspect current code, direct consumers, nearest stories and tests. Give it the current
backlog titles and summaries when available so it can identify likely duplicates. The worker
returns evidence to the coordinator; the coordinator owns GitHub Project writes and readback. If this
model or delegation is unavailable, report the limitation rather than silently changing models.

## Inspect journeys closely

Follow the requested area. For a general scan, map the main journeys and select a manageable
set for deep inspection, explaining the coverage. Trace entry, primary action, state changes,
failure and recovery through the actual callers and shared components. Report examined and
unexamined areas; a sample is not a complete product audit.

Look for inaccessible actions, unclear or incorrect state, focus/dismissal failures, lost edits,
repeated-action bugs, inconsistent shared controls, overflow and weak responsive behavior.
Check keyboard and touch paths, loading/empty/error/unavailable states, long translated labels
and themes where they affect the flow. Ground improvements in household tasks and Navet's
existing design direction, with the closest component family as the reference.

Use actual app or Storybook interactions for concerns that depend on rendering, layout or input
behavior, applying `navet-ux-audit` when needed. Retain the commit, route/story, state and observed
result. If rendering is unavailable, provide precise source evidence and mark rendered behavior
unverified. Source code can prove a logic defect; a screenshot alone cannot prove interaction.
Use synthetic data and preserve the worktree. The scanner edits no product files and creates no PR.

## Return and record findings

Return only concrete findings with user impact, affected source/callers, reproduction or source
evidence, expected behavior, confidence, smallest suggested change and an acceptance check.
Separate defects from optional improvements and unresolved hypotheses. Group consumers with a
shared root cause into one finding. A scan can legitimately return no actionable findings.

The coordinator verifies candidates against the current code and related Project drafts before
writing. Update a matching draft when there is useful new evidence; preserve human context.
Create concise findings using the proposal template's small-bug or bounded-improvement format.
Expand only when a real decision or uncertainty needs research. Do not create speculative tickets
to fill a quota. Retain detailed inspection evidence privately and link it when helpful.

Finish with draft links, strongest findings, coverage and missing verification. Record proposed
priority as a recommendation; implementation approval and prioritization remain with the maintainer.
