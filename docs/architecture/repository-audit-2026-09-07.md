# Repository audit — 7 September 2026

This records the expanded audit and implemented changes in the current working tree. Existing staged product work is preserved and is not credited as audit cleanup. No commit, push or deployment was performed.

## Implemented

### Provider ownership

Removed the unused Energy implementation and moved its behavioral tests to the live Home Assistant mapper; retained legacy grid-export support. Homey commands now translate inside the provider. Homey/openHAB adapters reuse their existing state builders.

[homeassistant-energy-helpers.ts](../../packages/provider-homeassistant/src/homeassistant-energy-helpers.ts), [homey-service.ts](../../packages/provider-homey/src/homey-service.ts).

### Package enforcement

Expanded the existing boundary gate to resolve literal static, dynamic, type and require imports across production packages, including relative paths and newly added providers. Negative fixtures protect the gate.

[package-import-policy.mjs](../../scripts/package-import-policy.mjs), [package-import-policy.test.mjs](../../scripts/package-import-policy.test.mjs).

### Dashboard persistence

Vite and nginx now share sanitization, settings scope, layout normalization, equality and patch policy. Fixed choresEnabled being dropped by the nginx sanitizer. Auth, locking, revisions and filesystem behavior remain in their runtime owners.

[dashboard-profile-policy.js](../../docker/shared/dashboard-profile-policy.js), [dashboard-profile-store-conformance.test.ts](../../packages/app/src/services/__tests__/dashboard-profile-store-conformance.test.ts).

### Portable domain rules

Core owns chore transition/calendar and credential/resource-host policies. Generated native JavaScript is checked for drift. Shared vectors protect Python authority parity; fixed expired-claim handling for terminal occurrences.

[build-runtime-policies.mjs](../../scripts/build-runtime-policies.mjs), [native-runtime-policy-smoke.js](../../scripts/native-runtime-policy-smoke.js).

### Host composition

Split the 3,114-line standalone Vite configuration into endpoint/transport plugins and a small composition root. Five hosts share alias, compiler and metadata conventions while preserving their intended differences.

[vite.config.ts](../../apps/standalone/vite.config.ts), [vite-host-conventions.ts](../../scripts/vite-host-conventions.ts).

### Entity selection

Shared immutable registry indexes and cached selection snapshots avoid repeated registry scans and unstable selected objects. Missing-entity queries no longer retain obsolete selection keys.

[use-provider-entity.ts](../../packages/app/src/hooks/use-provider-entity.ts), [use-provider-entity.test.tsx](../../packages/app/src/hooks/__tests__/use-provider-entity.test.tsx).

### Async lifecycle

Calendar/weather share collection lifecycle ownership while retaining their different error policies. Dashboard sync shares browser listeners and timer disposal. Light acknowledgments have independent pending state and timers. Media volume uses a provider-neutral serial queue. Fixed media-library search being cleared by irrelevant translation/time-format updates: initial browsing now reacts to actual player/capability changes and reads the current callback through an effect event. A deterministic regression demonstrates the pre-fix refetch.

[use-provider-collection-lifecycle.ts](../../packages/app/src/hooks/use-provider-collection-lifecycle.ts), [dashboard-sync-browser-lifecycle.ts](../../packages/app/src/features/dashboard/hooks/dashboard-sync-browser-lifecycle.ts).

### UI duplication

Unified media seek controls, light pending acknowledgments, automation formatting and settings type ownership. Removed internal barrel dependencies at primitive/pattern and dashboard utility seams.

[media-seek-timeline.tsx](../../packages/app/src/features/media/components/media/media-seek-timeline.tsx), [use-pending-light-value.ts](../../packages/app/src/features/lighting/components/light-card/use-pending-light-value.ts).

### Browser accessibility

Card primary actions are native sibling buttons rather than interactive ancestors of controls. Fixed camera double activation, active-light contrast, decorative overflow and marketing menu Escape focus restoration. Manual computed-color checks also found control glyphs at 2.02–2.29:1 contrast; the shared readable foreground raises the checked teal controls to 5.10–5.77:1 without replacing the custom color swatch. The power glyph now measures 6.84:1 against white, and the slider uses a readable track outline and thumb ring at 4.69:1 against teal.

[BaseCard.tsx](../../packages/app/src/components/primitives/base-card.tsx), [light-card-header.tsx](../../packages/app/src/features/lighting/components/light-card/light-card-header.tsx).

### RSS resource security

Fixed mapped IPv6/private address classification and public-host false positives. Development and production share DNS-pinned HTTPS retrieval through a bounded Node 22 transport. Production uses a private nginx-owned Unix socket, strips credentials, and supervises both processes together. Corrected the generated add-on configuration to select Ingress authentication and placed the 1 MiB response buffer on the internal subrequest location. Fixed BusyBox child supervision so a failed transport cannot leave nginx serving a partial runtime. Container verification is recorded below.

[vite-public-resource-request.ts](../../scripts/vite-public-resource-request.ts), [rss-proxy.js](../../docker/njs/rss-proxy.js).

### Measured website payload

In an isolated before/after import comparison, direct imports of the same live preview components remove unintended sibling dashboards: emitted JavaScript 7,367,703 to 6,003,109 bytes (18.5%); preview static dependency closure 3,028,133 to 2,620,313 bytes (13.5%). These are emitted bytes, not compressed transfer measurements. This comparison preceded the additional locale text and accessibility fixes; final website assets contain 6,122,722 JavaScript bytes across 46 asset files.

[MarketingProductPreviewSection.tsx](../../packages/app/src/marketing/sections/MarketingProductPreviewSection.tsx), [vite.config.ts](../../apps/website/vite.config.ts).

### Localization

Replaced hardcoded Energy workspace, KPI ordering, layout and custom-range controls with typed translation keys in all 13 supported locales. Preserved metric IDs and persisted settings; custom month labels now follow the selected UI locale. Symbol-only interpolation and proper-name map attribution are explicitly recognized by the existing checker rather than inventing translations for them.

## Verification

- Production dependency advisory lookup: 139 dependency records, no reported advisories at lookup time. This covers the production dependency graph, not a guarantee of vulnerability absence.
- Full unit suite: 481 files, 3,169 tests passed, including real Unix-socket/TLS transport tests.
- Native njs 0.8.4 and 0.8.10: 62 assertions each, all four generated modules plus shared dashboard policy. The 0.8.4 source version matches Alpine 3.20 nginx packaging; local Darwin/PCRE2 execution does not prove the Linux/PCRE1 APK or HTTP integration.
- Actual Docker HTTP/runtime gate: standalone and both ARM64/AMD64 add-on compatibility images passed, including authenticated pinned RSS, private DNS rejection, credential isolation, exact 1 MiB feeds, oversized/type/redirect rejection, post-error continuity, crash supervision, restart, and persisted auth/profile/chore state after replacement.
- Python Home Assistant integration: 22 tests passed.
- Chromium Storybook: 120 interaction stories passed; 39 camera/light/media stories rerun after the click fix.
- Ten rendered states: zero axe WCAG A/AA violations, page errors or horizontal overflow. This is sampled accessibility coverage.
- Standalone, demo, website and docs production builds passed; standalone bundle budget passed: 713.2 KB eager JavaScript, 137.6 KB authenticated transition JavaScript, and 552.5 KB CSS under the existing budget definition.
- TypeScript, provider/UI/story boundaries, runtime-artifact freshness and lockfile checks passed on the final source tree.

- Static production import scan: 1,209 files / 4,009 resolved edges, no cycle candidates. Type-only statements and dynamic imports were excluded; this is not a complete module-loader proof.

## Open limitations

### Exact Home Assistant base image

Docker Desktop was recovered. Standalone and both ARM64/AMD64 add-on HTTP/restart validation passed with the
new transport. The registry denies pulls of the exact Home Assistant base image, so the add-on
was tested with the documented Alpine 3.20 compatibility shim. This proves the packaged Node/nginx
runtime and persisted replacement behavior, but not the exact Home Assistant base/s6 integration.
Production npm advisory results do not cover OS image packages.

### Audit coverage

Repository inventory, duplicate candidates, package checks, owner/caller review, all unit tests, host builds and selected real-browser scenarios were covered. This is not a line-by-line proof of every function, penetration test, physical-provider integration run or low-power hardware benchmark. No claim of universal world-standard certification is justified.

### Intentional architecture

Keep the provider-neutral modular monolith, app compatibility seams and native Python authority. Further package moves, project references, universal card abstractions or microservices need a concrete ownership or measured operational benefit. Similar-looking code with different persistence/authentication contracts is not automatically duplicate policy.

## References

- [React external-store snapshot contract](https://react.dev/reference/react/useSyncExternalStore)
- [Alpine 3.20 nginx module source versions](https://raw.githubusercontent.com/alpinelinux/aports/3.20-stable/main/nginx/APKBUILD)
- [Native njs language compatibility](https://nginx.org/en/docs/njs/compatibility.html)
- [nginx JavaScript transport reference](https://nginx.org/en/docs/njs/reference.html)
- [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references)
