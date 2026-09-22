# Frontend audit — 22 September 2026

This is the first pass on `feature/performance-accessibility-audit`. It covers the four public entrypoints, the shared app shell, build output, and targeted security and accessibility patterns. It is not a claim that every dashboard state, story, or documentation page has been audited.

## Verified changes

| Area | Change | Verification |
| --- | --- | --- |
| Distribution size | The standalone, demo, website, and Storybook builds no longer ship copies of docs-only how-to screenshots. The docs build retains them. | Built output fell from 17,848 to 14,464 KiB (standalone), 17,952 to 14,184 KiB (demo), 18,960 to 15,192 KiB (website), and 35,312 to 31,544 KiB (Storybook). |
| Keyboard access | A shared skip link now reaches the main content in the demo and website. The demo adds a main landmark only in sections that lacked one; Household and Settings keep their existing landmarks. | Local browser: keyboard activation focused the target; all eight demo sections exposed exactly one main landmark. |
| Navigation semantics | The website's three main demo and install calls to action now share an anchor component styled with Navet's button tokens. | Local website: each call to action exposed a link with the expected destination and 40 px height. At 390 px wide, the layout had no horizontal overflow. |
| Shared subscriptions | Components using the same media query now share one browser change listener. | Focused hook test confirmed two consumers both update while the query has one active listener, and the listener is removed after the last consumer unmounts. |
| Demo initial load | The demo now loads seven non-home section views on demand, following the app dashboard's existing lazy-section pattern. Energy-only sample data and history loading stay with the Energy section. Root section URLs also restore the selected section after refresh. | The entry script fell from 1,349 to 1,094 KiB (about 19%). A local production preview rendered all seven sections through navigation and direct URLs without console errors. |
| Demo camera cost | The camera card is now loaded when the user opens the Outside room. Its card slot retains its footprint while loading. | The 134 KiB camera chunk is no longer in the demo home page's modulepreload list. In a local production preview, Outside showed a loading state, then the camera image and controls without console errors. |
| Docs image layout | The docs build now adds actual intrinsic dimensions to local images across all generated pages. | The build added dimensions to 299 images on 78 pages. A generated-HTML check found all 302 local images have width, height, and alt attributes; a local browser preview rendered the Security screenshots at responsive widths without errors. |
| Layout stability | The website hero background image declares its intrinsic dimensions. | Local website preview rendered the image with `width="1672"` and `height="941"`; no desktop horizontal overflow. |

The live home, demo, docs, and Storybook roots returned HTTP 200. The docs and Storybook already expose skip links. All four sites send HSTS, a content security policy, a referrer policy, a permissions policy, and `X-Content-Type-Options: nosniff`. The production demo rendered its dashboard sections; docs and Storybook rendered their navigation and primary content. The docs build produced 78 pages and kept its how-to screenshots. These checks are a route and markup sample, not a full accessibility certification.

A targeted source search of the app and public entrypoints found no production use of `dangerouslySetInnerHTML`, `eval`, or `new Function`. The three production `window.open` call sites include `noopener,noreferrer`, and the shared `Link` primitive supplies `noreferrer` for new tabs. This is a sink review, not a full security assessment.

## Tagged findings — no flow change yet

| Tag | Evidence | Next safe step |
| --- | --- | --- |
| `BUNDLE-DEMO-INITIAL` | After section and energy data splitting, the demo still emits a 1,094 KiB entry script and a 569 KiB stylesheet. The home view imports many card families and fixtures. | Profile the initial home graph and split only components whose loading state can preserve the current card layout and interactions. |
| `BUNDLE-ICON-REGISTRY` | `packages/app/src/constants/icon-map.ts` imports the full Lucide namespace to resolve stored icon names. Demo and website builds each emit an icon-map asset over 600 KiB; the demo preloads it for Home. Lucide's [dynamic icon guidance](https://lucide.dev/guide/react/advanced/dynamic-icon-component) warns that a dynamic resolver builds every icon and may add requests and visual flashes. | Keep persisted custom icon names working while testing a deferred registry or generated icon manifest. Measure bytes and first render before replacing the resolver. |
| `BUNDLE-STANDALONE-DEMO` | `apps/standalone/vite.config.ts` enables the embedded `/demo` route by default, so the standalone artifact includes demo-only assets such as both camera sample formats. | Decide whether the embedded route is an installation contract before changing the default. If retained, assess a separate optional distribution. |
| `SECURITY-INLINE-CSP` | Live demo, docs, and Storybook responses allow inline scripts in their CSP; the website does not. | Inventory actual inline boot scripts and framework needs, then use nonces or external scripts only after deployment preview testing. A direct CSP tightening could prevent these sites from booting. |

## Validation performed

- `pnpm build`, `pnpm build:demo`, `pnpm build:website`, `pnpm docs:build`, `pnpm build:storybook`, and `pnpm typecheck` passed.
- Focused Biome, `pnpm check:bundle-budget`, `pnpm check:website-audit`, `pnpm check:stories`, provider and UI-kit boundary checks, runtime policy and lockfile checks, and `git diff --check` passed.
- `pnpm check:docker` passed its standalone and Home Assistant add-on runtime checks.
- `pnpm audit --prod --audit-level high` reported no known production dependency vulnerabilities when run with network access.
- The media-query hook, dashboard layout, and app unit checks passed together (43 tests). A 390 px local demo resize kept one main landmark and no horizontal overflow.
- Local browser checks covered website skip-link focus and hero dimensions, plus all eight demo section landmarks and demo skip-link focus.
- A generated-HTML check found one main landmark, one h1, and an English document language on all 79 docs HTML pages. Storybook's shell and preview frames are JavaScript-driven and were excluded from this static landmark count.
