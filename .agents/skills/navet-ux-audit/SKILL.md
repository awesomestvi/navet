---
name: navet-ux-audit
description: Audit rendered Navet UI for UX defects, spacing and visual inconsistencies, primitive reuse, and interaction quality; produce reproducible findings and retest fixes. Use for proactive design audits or meaningful UI verification.
---

# Navet UX Audit

Reduce the maintainer's effort finding UI defects by inspecting real rendered behavior and giving
each finding a reproducible, reference-backed repair path. Audit mode is read-only; a request to
audit does not itself authorize fixing or posting findings to an external system.

## Reference And Scope

Follow the repository's `AGENTS.md` and `ai/skills/navet-ux.md`. For a visual recipe decision,
read `docs/design-system/AI-DESIGN-CONTEXT.md`. Repository-relative paths resolve from the Navet
checkout root. Use the closest component family as the primary reference; Home supplies dashboard
spacing and density when there is no closer reference. Inspect the actual primitive, token helper,
and nearest story before treating an implementation difference as a defect.

For a scoped change, inspect the changed surface and direct consumers of affected shared pieces.
For a broad audit, begin with essential household journeys and maintain a coverage ledger instead
of implying the entire product was inspected. Use public demo or synthetic fixture data; private
household installations require their existing authorization.

## Rendered Evidence

Use an available browser-control tool to inspect Storybook and connected product flows. If rendered
access is unavailable, report that limitation and label code-derived concerns unverified. Do not
convert a class-name difference into a verified spacing bug without observing its effect.

Record commit/build, route/story, viewport, theme, input mode, data state, and reproduction steps.
Use screenshots, computed styles, and element geometry when available to substantiate gaps,
alignment, clipping, touch targets, scroll ownership, and overlay placement. Check against the
reference's intended responsive behavior rather than enforcing identical pixels everywhere.

Inspect the relevant combinations of:

- Phone, tablet/wall-display, and desktop; smallest/largest supported card sizes.
- `glass`, `dark`, `light`, and `black`, including accent text, separators, focus, and overlays.
- Normal, active, loading, empty, unavailable, error, long-name/translated, and missing-data states.
- Touch/no hover, keyboard navigation and focus restoration, reduced motion, and supported effects quality.
- Open/close/reopen, navigation/back, save/cancel/reload, and persisted settings when applicable.

Select a bounded matrix by change risk; explain omitted combinations. A shared primitive change
needs representative consumers and its supported variants. Release review follows the agreed full
essential-journey matrix. Isolated stories do not establish that connected workflows behave correctly.

## Design And Interaction Checks

Inspect reading order, primary action visibility, density, spacing rhythm, alignment, typography,
control geometry, inherited surfaces, icon/label placement, border and separator contrast, and
unnecessary nested containers. Trace inconsistency to its owning primitive or composition; avoid
proposing local overrides that hide a shared defect.

Verify state explanations, disabled controls, errors and recovery, overflow actions, sheet/dialog
headers, scrolling, touch affordances, focus order, focus restoration, and edit-mode boundaries.
Check shared UI for provider payload leakage when inspecting the implementation behind a finding.

Use deterministic accessibility and focused browser checks as evidence alongside visual inspection.
Stabilize fixtures, fonts, animation, and loading before comparing screenshots. Keep approved
baselines; never approve new images automatically just to make a check pass.

## Findings And Retest

Separate verified defects, subjective improvement proposals, and unverified concerns. A verified
finding contains user impact, actual/expected behavior, reproduction, artifact evidence, violated
Navet reference, source owner, confidence, severity, and the smallest credible repair. Group
multiple symptoms under one shared cause and deduplicate against the authorized finding store.

Prioritize blocked actions, hidden controls, unreadable states, lost edits, and navigation failures,
then repeated inconsistencies and localized polish. Severity determines repair order; it does not
make confirmed design defects disappear. Use `docs/engineering/templates/idea-proposal.md` when
preparing a finding for prioritization. Post externally only to an explicitly authorized destination;
private evidence must remain private, including attachments and previews.

After an authorized fix, repeat the original reproduction and relevant adjacent cases at the new
commit. Run the narrowest meaningful checks indicated by the routed guide. Invalidate old evidence
when affected code changes. Report unresolved and unverified cases; do not declare a surface clean
from code review, tool success, or screenshots of only its ideal state.

End with verified findings ordered by impact, proposal-only suggestions separately, and a compact
coverage ledger listing passed/failed/unverified cases and remaining limitations. When no verified
defects are found, state the inspected scope and evidence. The maintainer retains final visual taste
and release acceptance.
