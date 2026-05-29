# Home Assistant Decoupling Audit

## Historical Status

This file is a historical snapshot from before Navet's package extraction and provider cleanup were
far enough along to be useful as current guidance.

Use these docs for the current state instead:

- [package-boundaries.md](package-boundaries.md)
- [provider-contract.md](provider-contract.md)
- [provider-neutral-ui.md](provider-neutral-ui.md)
- [../roadmap/provider-platform-roadmap.md](../roadmap/provider-platform-roadmap.md)

## Why This File Still Exists

This audit captured the original reasons Navet needed to separate:

- shared UI from Home Assistant payloads
- generic commands from Home Assistant service calls
- provider runtime code from app-level composition
- deployment/auth wiring from provider-neutral code

That work is now well underway and, in many areas, already reflected in the real package layout.

## How To Read It

- Treat it as background context, not as a task list.
- Expect some file paths, priorities, and migration notes to be outdated.
- If the audit and the current code disagree, trust the current architecture docs and the package
  layout in the repo.

## Current Bottom Line

The useful lesson from the audit is still valid:

1. Shared UI should consume normalized Navet models.
2. Provider packages should own provider-specific mapping and command translation.
3. `@navet/app` should own runtime selection and deployment wiring.

Everything else in the original audit is historical detail.
