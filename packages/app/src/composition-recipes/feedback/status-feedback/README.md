# Inline operation feedback

Present inline operation progress, success, warning and failure through MessageBar.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Present inline operation progress, success, warning and failure through MessageBar.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/primitives/message-bar.stories.tsx#Info`.

## Required context

- Navet theme context
- Caller supplies translated title/message and normalized operation state
- Feature owns retries, errors and operation lifecycle

## Supported states

loading, success, warning, error.

## Review criteria

- Status is conveyed by text and live region
- Errors announce as alerts
- All themes, long messages and reduced motion

Rendered maintainer acceptance is separate from structural validation.
