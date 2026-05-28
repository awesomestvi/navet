# Multi-Backend Architecture Guide

This document is Navet's canonical architecture reference.

Use it when work touches provider boundaries, runtime ownership, shared contracts, state flow,
adapter seams, or any refactor that could push Home Assistant-specific behavior into shared UI.

## Summary

Navet is a smart-home dashboard frontend with a provider-scoped architecture.

- Home Assistant is the most mature provider today.
- Homey support is implemented in the codebase today.
- openHAB is part of the provider model and type system, but remains planned rather than shipped.

That product reality does not change the architecture rule: Home Assistant is one provider adapter
inside Navet, not the application architecture.

## Core Principles

- Prefer Navet-owned contracts over backend raw payloads.
- Keep backend-specific auth, transport, mapping, action translation, and resource resolution
  inside provider-specific seams.
- Keep shared UI, shared state, and dashboard behavior provider-aware through normalized contracts,
  not through raw backend types.
- Document the current implemented seams honestly. Do not pretend that planned extractions or
  future provider parity already exist.

## Current Vocabulary

Use the current repo vocabulary consistently in docs and code:

- `IntegrationProviderId`
- `NavetDevice`
- `NavetRoom`
- `NavetRoomDescriptor`
- `NavetProviderRuntimeState`
- `NavetProviderSnapshot`
- `NavetProviderContract`
- provider-scoped IDs
- canonical IDs
- resource resolution
- runtime
- snapshot
- contract

Do not replace this with Home Assistant-first wording in shared docs.

## Current Implemented Seams

### Shared app surfaces

These are the shared architecture seams that app-facing work should build on:

- `src/app/core/`
  - Navet-owned provider, device, room, action, snapshot, and resource contracts
  - mapper entry points that normalize provider data into Navet-owned models
- `src/app/platform/`
  - provider feature interfaces, room-management abstractions, and resource-facing types
- `src/app/stores/`
  - `integration-store.ts` for cross-provider runtime state and normalized snapshots
  - shared app stores such as settings, navigation, theme, search, and error state
- `src/app/hooks/`
  - app-facing selectors and hooks such as `useProviderRuntime`, `useIntegrationStore`, and
    feature-level provider-aware data hooks
- `src/auth/`
  - runtime- and provider-aware auth entry layer for session bootstrap, provider selection, and
    logout or refresh behavior
- `src/app/features/`
  - feature-owned UI and controller code built on normalized contracts and runtime selectors

### Provider-specific surfaces

These are the adapter seams where backend-specific behavior belongs:

- `src/app/infrastructure/home-assistant/`
  - runtime detection
  - parent-panel bridge handling
  - auth session management
  - transport
  - media and artwork services
  - resource resolution
- `src/app/services/`
  - provider-facing service facades
  - Home Assistant transport and feature services
  - Homey service and client integration
- `src/app/stores/home-assistant-store.ts`
  - provider-specific runtime slice for Home Assistant entities, registries, and connection state

### Runtime modes

The current implementation supports these runtime paths:

- Home Assistant custom panel
- Home Assistant add-on through Ingress
- standalone Docker or hosted standalone app
- localhost development
- Homey OAuth through the standalone runtime path

Shared UI should not implement mode-specific behavior by branching on URLs or Home Assistant-only
knowledge when the behavior belongs in auth, runtime, resource, or provider services.

## Ownership Rules

### Shared layers own

- dashboard-visible device and room models
- provider selection and current provider runtime state
- normalized provider snapshots
- shared dashboard and settings state
- provider-scoped and canonical ID handling
- action intents
- resource requests and resolved resources

### Provider adapters own

- authentication details
- runtime detection quirks
- session persistence details
- REST and WebSocket transport
- backend raw payload parsing
- backend-to-Navet mapping
- backend-specific action translation
- backend-specific resource rewriting and proxy behavior

## Rules For New Work

- Prefer `integration-store`, `useProviderRuntime`, `useIntegrationStore`, and Navet-owned
  contracts before reaching for provider-specific stores or raw service payloads.
- If shared UI needs provider behavior, extend a provider/runtime seam instead of importing raw
  backend types into the feature.
- Keep provider-aware branching in shared code limited to capability differences, runtime
  availability, or intentionally different product UX.
- Keep resource URL construction and auth-sensitive path rewriting inside adapter-owned helpers.
- Use current repo paths and file names when documenting architecture. Do not keep stale references
  to removed layers.

## Forbidden Anti-Patterns

Do not introduce new shared-surface code that:

- imports `HassEntity` or other backend raw types into shared UI or shared stores
- calls Home Assistant services directly from generic card controllers or shared components
- constructs Home Assistant resource URLs directly inside cards or shared utilities when resolver
  seams already own that behavior
- treats Home Assistant areas, registries, or service semantics as the app-wide domain model
- uses provider-specific runtime state as the public architecture when normalized state already
  exists

## Implemented Now Vs Planned

### Implemented now

- provider IDs and provider definitions
- cross-provider runtime aggregation in `src/app/stores/integration-store.ts`
- Navet-owned device, room, resource, and action contracts in `src/app/core/`
- Home Assistant provider infrastructure under `src/app/infrastructure/home-assistant/`
- Homey service integration and snapshot mapping paths
- provider-aware dashboard and feature flows that consume normalized or provider-scoped data

### Planned or incomplete

- openHAB runtime and adapter implementation
- deeper parity between Home Assistant and Homey feature services
- further reduction of remaining Home Assistant-first assumptions in older hooks and feature paths
- broader provider feature contracts where only Home Assistant currently implements the behavior

## Documentation Rules

When architecture-adjacent work changes the codebase, update this file together with the most
relevant active docs:

- `docs/technical/REACT_ZUSTAND.md`
- `docs/agents/architecture.md`
- `docs/agents/project-map.md`
- `README.md`
- `AGENTS.md`
- `ai/agents.md`
- affected `ai/skills/*.md` files

## Decision Checklist

Before merging architecture-adjacent changes, verify:

- shared UI depends on Navet-owned or provider/runtime contracts instead of raw backend types
- backend-specific behavior lives in provider-specific seams
- runtime/auth/resource behavior is documented in the same place it is implemented
- docs use the same vocabulary as the live repo
- implemented support and planned support are described separately
