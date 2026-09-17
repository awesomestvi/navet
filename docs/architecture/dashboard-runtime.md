# Dashboard Runtime Boundaries

The dashboard is assembled in `@navet/app`, but its feature policies do not belong in one global
React controller. The runtime uses a small set of deeper modules so rendering, provider state,
synchronization, editing, and external metadata can evolve independently.

## Composition

`useDashboardController` exposes separate page, overlay, and active-section models. The page owns
readiness and navigation effects; overlays own add-card, add-entity, and onboarding dialogs; the
section router owns only active dashboard composition. Feature-specific rendering stays in the
feature module. For example, the lighting section owns its scenes, empty state, and restore dialog,
so unrelated Home layout changes do not rerender or reshape its card composition.

Do not add another field to every dashboard consumer for a feature-only need. Extend the narrowest
model or create a feature-owned section component. The router must not regain a manual comparator;
stable feature projections and normal React composition are the performance boundary.

## Provider Runtime Queries

`ProviderRuntimeQuery` is the app-facing query seam for provider entity snapshots, registry
entries, configuration, and feature selections. It owns provider-scoped ID resolution, indexed
registry lookups, prefix projections, stable empty values, and cached result references. React
hooks adapt those queries through `useSyncExternalStore`; feature modules should not rescan full
provider maps or assemble their own subscription fallback policy.

## Profile And Preference Synchronization

`createDashboardSyncRuntime` owns browser lifecycle state, named timers, disposal, and latest-only
command lanes. Profile and preference hooks keep their distinct reconciliation rules, persistence,
and user feedback, but delegate timing and command ordering to the shared non-React runtime. This
prevents overlapping refreshes and ensures a newer queued refresh replaces an obsolete one.

## Room Editing

Room editing has two domain boundaries:

- `roomWorkspaceEditorSessionReducer` owns atomic open, dirty, save, partial-failure, retry, success,
  and discard transitions.
- `executeRoomWorkspaceMutationTransaction` builds provider-neutral mutation plans, respects
  provider capabilities and dependencies, executes each provider plan, applies local overrides,
  and returns only the operations that remain retryable after a partial result.

The React controller adapts stores and view models to these boundaries. Provider mutation policy
and persistence must not move back into event handlers.

## Media Catalog

`MediaCatalog` owns public metadata enrichment for media items. It applies source fallback order,
URL sanitization, bounded request concurrency, in-flight request coalescing, per-consumer
cancellation, and LRU caching. Tile and table views consume one item projection through
`useMediaCatalogItem`; rendering code does not call MusicBrainz, Cover Art Archive, Wikidata,
Wikimedia Commons, or Spotify metadata endpoints directly.

Provider browsing and playback remain separate provider feature-service concerns. Catalog failure
is best effort and must preserve the dashboard's text and initials fallbacks.
