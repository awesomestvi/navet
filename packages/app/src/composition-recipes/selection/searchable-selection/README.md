# Searchable selection

Compose a controlled search and accessible single selection over feature-filtered options.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Compose a controlled search and accessible single selection over feature-filtered options.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/primitives/combobox.stories.tsx#Open`.

## Required context

- Navet theme context
- Feature supplies filtered options with unique IDs, query, selected ID and translated labels
- Feature owns source loading, capability filtering and selection persistence

## Supported states

closed, open, selected, empty, disabled, unavailable option.

## Review criteria

- Arrow keys skip unavailable options; Enter selects; Escape dismisses
- Pointer selection retains input focus; blur dismisses
- No results, disabled input, long labels and all themes

Rendered maintainer acceptance is separate from structural validation.
