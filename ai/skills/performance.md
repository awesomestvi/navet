# Performance

Read this file before changing rendering, animations, dashboard update flows, or adding dependencies.

## Runtime Assumption

- Assume Navet may run on Raspberry Pi Chromium kiosk hardware.

## Core Rules

- Prioritize smooth scrolling and responsive touch interactions.
- Avoid unnecessary re-renders.
- Avoid heavy always-running animations.
- Prefer CSS transforms over layout-heavy animation.
- Lazy-load expensive screens.
- Avoid adding large dependencies without strong justification.
- Watch bundle size.
- Prefer existing primitives, selectors, and stores over introducing new reactive layers.
- Keep frequent provider updates, especially Home Assistant WebSocket updates, from forcing broad tree re-renders.

## Dashboard Constraints

- Test with many Home Assistant entities.
- Dashboard cards must remain performant when many entities update frequently.
- Prefer work that degrades gracefully under frequent WebSocket updates.
- Do not introduce polling, timers, or media refresh loops without proving they are necessary.

Also guard against:

- repeated expensive URL resolution or fetch work on every render
- re-sorting or re-mapping large entity collections without need
- blur-heavy or layered visual treatments that hurt kiosk GPUs
- card-level state updates that cause full dashboard churn

## What Not To Do

- Do not add animation for its own sake on first-screen cards.
- Do not introduce a dependency just to solve a small UI problem that existing code can already handle.
- Do not put per-frame or per-second timers in multiple cards without a measured reason.
- Do not move frequently changing provider data through extra component layers if a selector or store action can keep it narrower.
- Do not optimize only for localhost on a powerful laptop.

## Known Navet Failure Modes To Guard Against

- dashboard slowdown when many provider entities update over WebSocket
- camera and media surfaces that keep refetching or recreating heavy objects
- visual effects that look good on desktop but stutter on Raspberry Pi Chromium
- global rerenders caused by broad subscriptions or poorly scoped derived data

## Required Routing

Read this file before changing:

- `src/app/features/dashboard/`
- `src/app/features/media/`
- `src/app/features/security/`
- `src/app/hooks/`
- `src/app/stores/`
- `src/app/infrastructure/home-assistant/`

Home Assistant infrastructure is a current adapter-specific hotspot, not the permanent global runtime model.

## Relevant Repo Areas

- Dashboard feature: `src/app/features/dashboard/`
- Media and camera surfaces: `src/app/features/media/`, `src/app/features/security/`
- Runtime helpers and selectors: `src/app/hooks/`, `src/app/stores/`, `src/app/infrastructure/home-assistant/`
