# Navet Layout Structure

This document describes the current app-shell and dashboard layout structure in Navet.

Use it together with:

- [README.md](README.md)
- [FEATURES.md](FEATURES.md)
- [UI-GUIDELINES.md](UI-GUIDELINES.md)

## App Shell

The dashboard shell is assembled in
[`src/app/features/dashboard/shell/index.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/shell/index.tsx).

Current structure:

```text
DashboardLayout
├── optional wallpaper / theme background layers
├── Sidebar
│   ├── desktop left rail
│   └── mobile bottom navigation
└── main content column
    ├── Header
    └── section content
```

Key layout rules:

- Desktop content shifts right with `md:ml-16` to clear the fixed sidebar rail.
- Main content uses a single vertical column with responsive padding.
- Wallpaper, glass overlays, and readability layers are handled by the shell, not duplicated by features.

## Sidebar Navigation

The sidebar lives in
[`src/app/components/layout/sidebar.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/layout/sidebar.tsx).

Current behavior:

- Desktop uses a fixed 64px left rail with icon-only navigation.
- Mobile does not use a hamburger menu. It uses a fixed bottom navigation bar instead.
- The mobile bottom navigation hides on downward scroll and reappears near the top of the page.
- Navigation targets are section-based (`home`, `energy`, `security`, `tasks`, `locks`, `lights`, `media`, `settings`).

## Header

The header lives in
[`src/app/components/layout/header.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/layout/header.tsx).

Current structure:

- Greeting headline with release badge
- Date, time, and week metadata
- Desktop inline search
- Desktop and mobile header actions
- Mobile expandable search row below the main header row

Important differences from older layouts:

- The header is not a simple `Dashboard` title bar anymore.
- Mobile search expands inline below the header instead of relying on a persistent search bar.
- Header copy is greeting-driven and localized.

## Room Navigation

Room navigation lives in
[`src/app/components/layout/room-nav.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/layout/room-nav.tsx).

Current behavior:

- The room nav is a sticky horizontal pill row.
- It includes `All` plus the discovered/persisted room list.
- In edit mode it can expose room reordering, all-view grouping, and add-entity actions.
- Sticky activation is handled with an intersection-observer marker rather than a hardcoded header offset contract.
- Theme-specific sticky shell styling comes from computed surface values, not a single static black glass bar.

## Dashboard Card Layout

Card sizing and span rules are defined by the shared registry in
[`src/app/components/shared/card-size-selector.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size-selector.tsx).

Supported logical sizes:

- `tiny`
- `extra-small`
- `small`
- `medium`
- `medium-vertical`
- `large`
- `extra-large`

Rules:

- Layout uses the shared `getCardSpanClass(...)` mapping.
- Do not duplicate size-to-span logic in feature code or docs.
- Preview sizing, overlay sizing, and dashboard placement all derive from the shared registry.

## Home Dashboard Grid

The current home overview grid lives in
[`src/app/features/dashboard/components/home-dashboard-overview-card-grid.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/components/home-dashboard-overview-card-grid.tsx).

Current behavior:

- The grid uses responsive logical column counts from `useBreakpointCols()`.
- Rendered grid width can auto-scale down to fit narrower containers.
- Edit mode can add inline add-card slots and drag/drop targets.
- Offscreen paint cost is reduced outside the highest effects-quality mode.
- Empty sections and empty canvases use shared shell styling rather than ad hoc layout placeholders.

This means older fixed-width documentation such as "2 / 4 / 6 / 8 columns everywhere" should not
be treated as the source of truth. The current source of truth is the shared grid helpers plus the
overview grid implementation.

## Sticky and Layering Rules

Current shell layering:

- Background and wallpaper layers live at the shell root.
- Sidebar and mobile bottom navigation use fixed positioning above content.
- Header and room nav provide local sticky behavior inside the content column.
- Dialogs, dropdowns, and toasts continue to own their own overlay layers.

When changing sticky behavior:

- prefer existing sticky markers and shell classes over hardcoded offsets
- verify mobile bottom-nav interaction with page scroll
- verify sticky room-nav behavior across themes and safe-area insets

## Responsive Model

Current responsive strategy:

- Desktop: fixed left rail + padded content column
- Mobile: bottom navigation + stacked content + expandable mobile search
- Room navigation remains horizontally scrollable across sizes
- Dashboard sections scale through shared card-size and grid helpers rather than bespoke per-breakpoint card dimensions

## Performance Notes

Layout and shell changes must remain safe for lower-power devices.

Watch for:

- repeated backdrop blur layers
- duplicated wallpaper overlays inside feature sections
- extra sticky wrappers that create redundant paint work
- hardcoded layout measurements that bypass shared grid helpers

## Source Of Truth

For layout changes, prefer the current implementation over historical diagrams:

- [`src/app/features/dashboard/shell/index.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/shell/index.tsx)
- [`src/app/components/layout/sidebar.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/layout/sidebar.tsx)
- [`src/app/components/layout/header.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/layout/header.tsx)
- [`src/app/components/layout/room-nav.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/layout/room-nav.tsx)
- [`src/app/features/dashboard/components/home-dashboard-overview-card-grid.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/features/dashboard/components/home-dashboard-overview-card-grid.tsx)
- [`src/app/components/shared/card-size-selector.tsx`](/Users/vishal/Development/Github/Navet/Navet/src/app/components/shared/card-size-selector.tsx)

Last updated: April 27, 2026
