# Text field with validation

Compose FieldBlock and Input with unique label and message associations, visible validation and native required/disabled state.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: An existing settings workflow needs a labeled text field with validation.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/field-block.stories.tsx#Default`.

## Required context

- Navet theme context
- Caller supplies translated copy, value and change callback
- Feature owns validation, save, cancellation and persistence

## Supported states

valid, invalid, required, disabled.

## Review criteria

- Label activates its own input
- Hint or error is associated with the input
- Multiple instances have unique IDs
- Required, disabled and error states
- Long translated copy and all four themes

Rendered maintainer acceptance is separate from structural validation.
