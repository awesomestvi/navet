---
title: Developers
description: Contribute to Navet and understand where shared and provider-specific work belongs.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/developers.md
---

Navet is organized as a pnpm workspace with deployable applications under `apps/` and product,
provider, core, and UI packages under `packages/`.

## Set up the repository

Use the [contributing guide](/developers/contributing/) for prerequisites, local development, and
validation expectations.

## Architecture direction

- `@navet/core` owns provider-neutral contracts, IDs, and runtime semantics.
- `@navet/ui` is the target boundary for provider-neutral shared React UI.
- Provider packages own provider authentication, transport, mapping, and command translation.
- `@navet/app` owns product composition, runtime selection, settings, and persistence.

Home Assistant is the reference adapter, not the application architecture. New shared work should
depend on Navet-owned contracts rather than raw provider payloads.

Detailed maintainer, architecture, testing, release, and AI-agent documents remain available in the
[repository documentation](https://github.com/awesomestvi/navet/tree/main/docs) without being added
to the public navigation automatically.
