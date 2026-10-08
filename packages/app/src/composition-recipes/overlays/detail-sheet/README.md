# Detail sheet

Compose a mobile detail sheet with a direct-child SheetSurfaceHeader, localized dismissal and separately padded body.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Focused detail or commands need a mobile sheet; enable responsive only when desktop should use the same surface.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/primitives/sheet-surface.stories.tsx#Default`.

## Required context

- Navet theme and i18n context
- Caller supplies translated title, close label, body and a launch-button returnFocusRef
- Mobile-only by default; responsive enables desktop
- Feature owns commands and persistence

## Supported states

closed, mobile, responsive desktop.

## Review criteria

- Header remains a direct child of SheetSurface
- Close label reaches the shell and header
- Dismissal and focus return
- Long body scroll and mobile keyboard
- Mobile-only and responsive desktop behavior in all four themes

Rendered maintainer acceptance is separate from structural validation.
