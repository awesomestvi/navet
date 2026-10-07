# Text field group

Group labeled fields with caller-owned values and associated validation.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Group labeled fields with caller-owned values and associated validation.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/field-block.stories.tsx#MultipleFields`.

## Required context

- Navet theme context
- Caller provides unique field keys and translated title, labels, hints and errors
- Feature supplies validation and change callbacks

## Supported states

valid, required, invalid, disabled.

## Review criteria

- Labels activate the correct fields
- Unique IDs and error descriptions
- Disabled and required fields; long labels

Rendered maintainer acceptance is separate from structural validation.
