# Marketing Website

This folder contains the public marketing website application structure for Navet.

## Folders

- `pages/`: page-level composition only
- `sections/`: reusable marketing sections used by the pages
- `data/`: marketing copy and static demo fixtures
- `constants/`: website/public link constants
- `seo/`: metadata generation and document head helpers
- `routing/`: route normalization and route resolution
- `shell/`: shared marketing page shell and section shell
- `icons/`: marketing-local icon helpers

## Rules

- Pages compose sections and should not own raw fixture definitions.
- Fixture-heavy preview data belongs in `data/marketingDemoData.ts`.
- User-facing copy and enumerated support, install, and roadmap content belong in
  `data/marketingContent.ts`.
- Marketing sections should continue using shared primitives and existing dashboard cards rather
  than creating a parallel design system.

