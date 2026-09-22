# Frontend audit — 22 September 2026

This is the first pass on `feature/performance-accessibility-audit`. It covers the four public entrypoints, the shared app shell, build output, and targeted security and accessibility patterns. It is not a claim that every dashboard state, story, or documentation page has been audited.

## Verified changes

| Area | Change | Verification |
| --- | --- | --- |
| Distribution size | The standalone, demo, website, and Storybook builds no longer ship copies of docs-only how-to screenshots. The docs build retains them. | Built output fell from 17,848 to 14,464 KiB (standalone), 17,952 to 14,184 KiB (demo), 18,960 to 15,192 KiB (website), and 35,312 to 31,544 KiB (Storybook). |
| Keyboard access | A shared skip link now reaches the main content in the demo and website. The demo adds a main landmark only in sections that lacked one; Household and Settings keep their existing landmarks. | Local browser: keyboard activation focused the target; all eight demo sections exposed exactly one main landmark. |
| Layout stability | The website hero background image declares its intrinsic dimensions. | Local website preview rendered the image with `width="1672"` and `height="941"`; no desktop horizontal overflow. |

The live home, demo, docs, and Storybook roots returned HTTP 200. The docs and Storybook already expose skip links. All four sites send HSTS, a content security policy, a referrer policy, a permissions policy, and `X-Content-Type-Options: nosniff`. The production demo rendered its dashboard sections; docs and Storybook rendered their navigation and primary content. The docs build produced 78 pages and kept its how-to screenshots. These checks are a route and markup sample, not a full accessibility certification.

## Tagged findings — no flow change yet

| Tag | Evidence | Next safe step |
| --- | --- | --- |
| `BUNDLE-DEMO-INITIAL` | The demo production build emits a 1,349 KiB entry script and a 569 KiB stylesheet. `packages/app/src/demo/demo-app.tsx` statically imports all section views and many card families. | Split section views behind lazy boundaries, preserve direct URLs and in-section state, then measure initial download and section transitions in a browser. |
| `BUNDLE-ICON-REGISTRY` | `packages/app/src/constants/icon-map.ts` imports the full Lucide namespace to resolve stored icon names. Demo and website builds each emit an icon-map asset over 600 KiB. | Keep persisted custom icon names working while testing a deferred registry or generated icon manifest. Measure bytes and first render before replacing the resolver. |
| `BUNDLE-STANDALONE-DEMO` | `apps/standalone/vite.config.ts` enables the embedded `/demo` route by default, so the standalone artifact includes demo-only assets such as both camera sample formats. | Decide whether the embedded route is an installation contract before changing the default. If retained, assess a separate optional distribution. |
| `ACCESS-NAVIGATION-LINKS` | The website hero and lower demo/install CTAs use buttons with `window.location.assign` in `MarketingHeroSection.tsx` and `MarketingDemoCtaSection.tsx`. | Replace navigation actions with anchors through a shared button-styled link, preserving the current focus and visual treatment. |
| `SECURITY-INLINE-CSP` | Live demo, docs, and Storybook responses allow inline scripts in their CSP; the website does not. | Inventory actual inline boot scripts and framework needs, then use nonces or external scripts only after deployment preview testing. A direct CSP tightening could prevent these sites from booting. |
| `SECURITY-DEPENDENCIES-UNVERIFIED` | `pnpm audit --prod --audit-level high` could not reach the npm advisory endpoint (`ENOTFOUND`). | Re-run the advisory audit when registry access is available; do not infer a clean dependency state from the failed request. |

## Validation performed

- `pnpm build`, `pnpm build:demo`, `pnpm build:website`, `pnpm docs:build`, `pnpm build:storybook`, and `pnpm typecheck` passed.
- Focused Biome, `pnpm check:bundle-budget`, `pnpm check:website-audit`, `pnpm check:stories`, provider and UI-kit boundary checks, runtime policy and lockfile checks, and `git diff --check` passed.
- `pnpm check:docker` passed its standalone and Home Assistant add-on runtime checks.
- Local browser checks covered website skip-link focus and hero dimensions, plus all eight demo section landmarks and demo skip-link focus.
