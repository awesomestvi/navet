# Metric and action layout

Pair a normalized metric with a capability-gated household action inside an existing card.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Pair a normalized metric with a capability-gated household action inside an existing card.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/primitives/card-metric-action-layout.stories.tsx#Default`.

## Required context

- Navet theme context and existing card layout/dimensions
- Caller supplies translated labels, normalized value and canonical accent class
- Feature owns action availability and provider command routing

## Supported states

small, medium, large, active, inactive, unavailable action, no action.

## Review criteria

- Metric reads before the primary action
- All supported card sizes and long labels
- Disabled or absent unsupported action

Rendered maintainer acceptance is separate from structural validation.
