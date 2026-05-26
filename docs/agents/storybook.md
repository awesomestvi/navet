# Storybook

This file defines Storybook-specific constraints for Navet agents.

## Core Rules

- Before adding a new story file, check whether a story for that component already exists. Extend the existing story file instead of creating a duplicate.
- If you add or reorganize stories, run `pnpm check:stories` and keep Storybook titles, coverage, and colocated story ownership valid.
- Keep Storybook frame and utility components in `src/app/storybook/`, not in feature or dashboard subdirectories.

## Base Path And Asset Rules

- Storybook builds for GitHub Pages at `/navet/storybook/` via `STORYBOOK_BASE_PATH=/navet/storybook/`.
- Keep manager and preview asset paths relative or base-aware.
- Do not add root-relative asset paths such as `/logo.svg` in Storybook configuration.

## Ownership And Fixture Rules

- Storybook is the review surface for shared UI and stable visual behavior.
- Prefer deterministic Storybook fixtures over live Home Assistant data or app-only side effects.
- Keep shared Storybook helpers in `src/app/storybook/story-frames.tsx` and `src/app/storybook/story-docs.ts`.

## Related Guidance

- Broader Storybook workflow details also live in [../STORYBOOK_WORKFLOW.md](../STORYBOOK_WORKFLOW.md).
- UI-layer boundaries live in [ui-and-theming.md](ui-and-theming.md).
