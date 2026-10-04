---
name: navet-ux-audit
description: Review rendered Navet UI for an accepted ticket or PR, record reproducible UX and accessibility findings, and retest scoped repairs. Use for UI acceptance, responsive or theme verification, or a reported interaction defect.
---

# Ticket UX audit

Review the current ticket's affected surfaces and direct consumers of changed shared components.
Keep findings and repairs within the accepted scope. This skill grants no additional authority to
publish, message others, expand implementation or start recurring audits. Existing task
authorization governs those actions.

## Establish the reference

Read the root and applicable scoped agent instructions, `ai/skills/navet-ux.md`, and
`docs/design-system/AI-DESIGN-CONTEXT.md`. Inspect the nearest implementation and story.
Use the same component family as the reference; use Home for dashboard rhythm when there is no
closer reference. Name the reference and intended reading order, primary action and state behavior.
Use `pnpm agent:components <name>` and composition recipes when shared contracts need inspection.

## Render and exercise the affected flow

Use the available browser control to inspect the actual app or Storybook flow. Record the current
commit, route or story ID, viewport, theme, input method, data state and rendered evidence.
Source inspection can identify a concern but cannot prove rendered behavior. If rendering is
unavailable, label the concern unverified and record the missing validation.

Choose a risk-based matrix from the ticket's acceptance criteria:

- Relevant phone, tablet and desktop widths, and smallest/largest supported card sizes.
- Glass, dark, light and black themes, including overlay, border, label and separator contrast.
- Supported normal, active, loading, empty, unavailable, error and permission states.
- Touch, keyboard focus and dismissal, no-hover use and reduced motion where applicable.
- Long or translated names, missing optional data and high/reduced effects where affected.
- Cancellation, close/reopen, repeated save and persisted state when the flow edits settings.

State which cases were exercised and why other cases are outside the changed surface. Do not
expand a small ticket into a full-product audit. Exercise real interactions, not just screenshots.
Check reading order, primary action, density, alignment, touch targets, scroll ownership, focus
containment/return, state clarity and provider ownership. Compare with the named reference and
shared surface/token contracts.

## Record and retest findings

For each concrete finding, record reproduction steps, expected and actual behavior, user impact,
rendered evidence, affected source, severity/confidence and the smallest repair. Deduplicate
against the current ticket. Separate taste decisions from correctness or accessibility defects.
Keep evidence in the ticket's existing deliverable or approval package; external publication
requires the task's existing authorization.

Apply repairs when the accepted task already authorizes them. Identify necessary scope changes
before implementing beyond that authority. Retest the exact failed flow and relevant direct
consumers on the current head. Run focused deterministic checks and report remaining unverified
cases. Import checks, passing stories and a default-state screenshot each prove only their own
narrow case; maintainer acceptance remains a separate decision.
