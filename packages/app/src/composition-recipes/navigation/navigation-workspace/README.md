# Sidebar workspace

Compose the named NavigationWorkspace members into a responsive selection workspace.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Compose the named NavigationWorkspace members into a responsive selection workspace.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/navigation-workspace.stories.tsx#Default`.

## Required context

- Navet theme and accent context
- Named members must stay inside NavigationWorkspace.Frame
- Caller supplies unique IDs, valid selection, translated copy and permitted destinations

## Supported states

selected, changed selection, disabled destination, phone stacked, desktop split.

## Review criteria

- Keyboard activates enabled destinations
- Selected navigation identifies its content
- Phone stacks navigation/content; desktop splits without overflow

Rendered maintainer acceptance is separate from structural validation.
