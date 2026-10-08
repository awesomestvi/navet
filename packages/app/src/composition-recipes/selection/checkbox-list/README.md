# Checkbox list

Compose controlled multi-selection with native checkbox keyboard behavior.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Compose controlled multi-selection with native checkbox keyboard behavior.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/selectable-checkbox-row.stories.tsx#Preview`.

## Required context

- Navet theme context
- Caller supplies unique item IDs, translated copy and controlled selection
- Feature owns capability checks and persistence

## Supported states

selected, unselected, disabled, empty.

## Review criteria

- Label and Space toggle one item
- Unavailable options cannot change
- Empty and long-label states; semantic list items

Rendered maintainer acceptance is separate from structural validation.
