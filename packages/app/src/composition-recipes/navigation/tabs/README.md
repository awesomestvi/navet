# Controlled tabs

Connect canonical keyboard tabs and their panels with controlled feature state.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Connect canonical keyboard tabs and their panels with controlled feature state.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/primitives/tabs.stories.tsx#Default`.

## Required context

- Navet theme context
- Caller supplies unique item IDs, translated labels and valid enabled selection
- Feature owns panel content and selection persistence

## Supported states

selected, changed selection, disabled tab.

## Review criteria

- Arrow navigation skips disabled tabs
- Hidden panels leave the focus order
- Long labels and narrow layouts

Rendered maintainer acceptance is separate from structural validation.
