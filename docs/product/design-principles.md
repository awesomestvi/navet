# Navet Design Principles

These principles define what "correct for Navet" means at product level. They outrank temporary
component conventions. Changes require explicit maintainer approval.

## Clarity Before Decoration

A person should understand what a surface contains, what changed, and what the primary action does
before reading supporting text. Use hierarchy, alignment, grouping, and concise language before
adding borders, layers, badges, effects, or whitespace.

## Dense, Not Cramped

Navet carries real household state. Use available space efficiently, especially on tablets and
landscape screens, while keeping controls comfortable for touch and states easy to scan. Density
must come from prioritization and responsive composition, not smaller unreadable text or clipped
content.

## One Interaction Model Across Screens

Phone, tablet, wall display, and desktop layouts may rearrange or reduce secondary detail, but they
should not become separate products. Primary actions, terminology, state meaning, and navigation
remain recognizable.

## State Is Functional Information

Never rely on color, motion, or hover alone. Unavailable, loading, warning, active, and destructive
states must remain understandable with keyboard, touch, reduced motion, and supported themes.

## Household Language

Use concise sentence-case language that describes the home and the action. Expose provider or
entity terminology only where it helps setup, diagnosis, or an advanced decision.

## Honest Capability

Show controls only when the owning provider supports the required capability. Prefer a clear
unavailable explanation over a control that fails, a silent fallback, or provider-specific
behavior disguised as a shared contract.

## Deliberate Visual Character

Navet should feel calm, warm, precise, and practical. "Premium" means reliable hierarchy,
alignment, restraint, and responsive behavior; it does not mean more glass, gradients, shadows,
animation, hero copy, or empty space.

## Evidence For Approval

Meaningful UI changes need a working preview at relevant phone, tablet, and desktop sizes. Automated
screenshots and accessibility checks detect objective regressions, but the maintainer decides
whether the resulting experience is right for Navet.
