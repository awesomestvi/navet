# Sortable table building block

Connect semantic table headers to caller-sorted normalized rows.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Connect semantic table headers to caller-sorted normalized rows.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/primitives/sortable-table-header.stories.tsx#InteractiveTable`.

## Required context

- Navet theme context
- Caller supplies unique row/column IDs, translated caption/headers/sort labels and cell strings
- Feature owns stable sorting, validation and persistence

## Supported states

unsorted, ascending, descending, empty, disabled column.

## Review criteria

- Keyboard sort updates rows and aria-sort
- Unavailable columns cannot sort
- Empty rows and long content; phone horizontal scroll

Rendered maintainer acceptance is separate from structural validation.
