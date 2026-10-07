# Form modal with save and cancel

Edit feature settings in a form modal building block with explicit save, cancel and focus return.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: A feature explicitly needs a Save/Cancel form. Establish its feature-specific save policy before adapting this draft building block.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/card-dialog.stories.tsx#Default`.

## Required context

- Navet theme and i18n context
- Caller supplies translated labels, form content and connected returnFocusRef
- Feature handles dismiss/cancel requests, validation, pending saves and persistence

## Supported states

closed, clean, dirty guarded, invalid, pending, save failure, saved.

## Review criteria

- Save/cancel stay in the footer
- Every close request goes through the feature policy; pending/dirty requests may be refused
- Validation and failed save preserve edits
- Keyboard focus containment and return after accepted closure

Rendered maintainer acceptance is separate from structural validation.
