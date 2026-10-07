# Empty card with optional action

Compose BaseCard and CardEmptyState with a single optional configuration action and caller-owned dimensions.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: A configured card has no selection or matching content; device unavailable state uses its device family instead.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/card-empty-state.stories.tsx#Playground`.

## Required context

- Navet theme context
- Caller owns card dimensions and translated copy
- An action requires a supported destination and callback
- Small, medium and large compositions require separate review

## Supported states

small, medium, large, with action, without action.

## Review criteria

- Small, medium and large cards
- With and without a supported action
- Long names and translated copy
- No matches versus unconfigured content
- All four themes and keyboard action

Rendered maintainer acceptance is separate from structural validation.
