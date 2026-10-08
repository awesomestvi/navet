# Section container

Organize a standard SectionCard with populated, empty and unavailable content.

Level: `building-block`. Review: `draft`. Owner: Navet maintainers.

Use when: Organize a standard SectionCard with populated, empty and unavailable content.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/components/patterns/section-card.stories.tsx#Default`.

## Required context

- Navet theme and settings store context
- Use inside the existing dashboard shell and spacing mode
- Caller supplies translated labels and supported action; feature owns data/capabilities

## Supported states

populated, empty, unavailable, supported action, unsupported action.

## Review criteria

- No additional page shell or hero
- Clear section hierarchy across widths
- Unavailable action disabled; omitted actions stay absent

Rendered maintainer acceptance is separate from structural validation.
