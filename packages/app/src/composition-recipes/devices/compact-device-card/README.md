# Switch card

Use the existing Navet switch card, including its identity, power control, metrics and feature controller.

Level: `product`. Review: `pending`. Owner: Navet maintainers.

Use when: Compose a switch card in Navet. Other device families require their own feature reference.

The manifest declares the exact exports and the generator resolves their Storybook links.
Primary reference: `packages/app/src/features/lighting/components/entity-card-switch.stories.tsx#Small`.

## Required context

- Navet theme, i18n, provider runtime and settings-store context
- Caller supplies provider-scoped entity identity and household name
- Existing switch controller owns capabilities, provider routing and persisted appearance

## Supported states

active, inactive, tiny, extra-small, small, edit mode.

## Review criteria

- Compare against Cards/Entity/Switch at the same size and state
- Power control and dialog remain feature-owned
- Tiny, extra-small, small, long names and all four themes
- Keyboard operation, unavailable provider and capability checks in the existing feature

Rendered maintainer acceptance is separate from structural validation.
