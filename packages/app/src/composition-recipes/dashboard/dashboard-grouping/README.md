# Grouping navigation

Connect grouping modes and item navigation to labeled content panels.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Connect grouping modes and item navigation to labeled content panels.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/dashboard-grouping-navigation.stories.tsx#TypeGrouping`.

## Required context

- Navet theme context
- Caller supplies unique mode/item IDs, labels and a valid selected item for the active mode
- Feature computes groups and panel data and persists selection

## Supported states

selected group, changed mode, attention indicator, no modes.

## Review criteria

- Grouping menu returns focus
- Keyboard arrows/Home/End navigate corresponding panels
- Horizontal phone overflow and long group names

Rendered maintainer acceptance is separate from structural validation.
