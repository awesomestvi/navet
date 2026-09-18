# Navet Dashboard Principles

This document applies the product vision to dashboards. Changes require explicit maintainer
approval. Component-level implementation rules remain in the design-system documentation.

## Information Order

Dashboard surfaces prioritize:

1. identity and location
2. current state or value
3. exception, warning, or unavailable state
4. primary household action
5. secondary detail and configuration

## Composition

- Home establishes the outer spacing, section rhythm, summary spacing, and responsive density used
  by other dashboard sections unless a documented task-specific composition is stronger.
- Cards adapt intentionally at supported sizes. Do not scale or clip a desktop composition into a
  smaller card.
- Prefer one semantic surface. Avoid nesting cards and panels merely to create visual hierarchy.
- Preserve user-selected spacing and dashboard layout choices. Feature sections do not introduce
  private page shells, centered max-width containers, or unrelated padding systems.

## Controls

- Keep the most likely household action obvious and avoid duplicating it in several card regions.
- Reduce simultaneous controls as space narrows; move advanced or uncommon actions into a focused
  dialog or section.
- Do not depend on hover. Ordinary controls must remain clear for touch and keyboard use.
- Keep unavailable controls honest. Do not route an action through another provider or capability
  simply to make the UI appear complete.

## Responsive Review

Review meaningful dashboard changes at minimum on a phone, tablet portrait, tablet landscape, and
desktop. Check realistic long names, translated text, missing optional data, loading, error,
unavailable, active, and empty states that the feature supports.

## Dashboard Ownership

The connected platform owns device truth. Navet owns presentation, provider-neutral selection,
dashboard layout, and its documented persistence model. Users select sources per feature; Navet
does not introduce a global primary-provider preference.
