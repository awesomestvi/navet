## Outcome

Describe the user or maintainer outcome. Link the issue and its acceptance criteria.

Closes #

## Evidence

- Deterministic checks run:
- Regression test or reproduction evidence for bugs:
- Rendered states and viewports for UI changes:

## Impact

- Product / UX:
- Providers and deployment modes:
- Persistence, security, or architecture:
- Performance and low-power hardware:

## Documentation decision

State which surfaces are affected and why: README, user docs, architecture, provider docs,
Storybook, website, agent instructions, product principles, release docs, or none. Do not edit a
document only to satisfy this section.

## Human review

- UI changes: review the demo and Storybook previews on relevant phone, tablet, and desktop sizes.
- For ordinary product and UI changes, the maintainer's merge records acceptance after CI passes
  and review conversations are resolved.
- Foundational or security approval: use the SHA-bound `/approve-foundation` or `/approve-security`
  command from the review summary when required.
- A new commit invalidates prior foundation or security approval.
