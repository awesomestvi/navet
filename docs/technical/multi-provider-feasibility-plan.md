# Multi-Provider Navet Feasibility Plan

## Summary

Adding Homey and later OpenHAB is feasible, but not easy in Navet's current shape. For a single aggregated dashboard, this is a medium-to-large architecture project, not an adapter-only change, because Navet is currently Home Assistant-specific through auth, connection state, entity storage, room derivation, device mapping, and action dispatch in places like `src/app/services/home-assistant.service.ts`, `src/auth/types.ts`, and `src/app/hooks/use-ha-devices.ts`.

Recommended target: support aggregated Home Assistant + Homey first with a curated subset, and design the abstraction so OpenHAB can plug into the same provider interface later. Do not try to generalize the whole product at once.

## Key Changes

- Introduce a provider layer:
  - `AutomationProvider` interface for auth/session, initial snapshot load, live updates, device actions, rooms/zones, media/camera capability exposure, and health status.
  - `ProviderSession` type keyed by provider (`home_assistant | homey | openhab`) instead of HA-only `AuthSession`.
  - `ProviderDevice`, `ProviderRoom`, and `ProviderAction` canonical models separate from HA entity payloads.

- Split current HA-specific store/service into two layers:
  - Provider adapters keep raw backend contracts and reconnection logic.
  - Aggregation layer merges provider outputs into one canonical store used by the UI.
  - Preserve provider provenance on every room/device/action so duplicates and conflicts are explainable.

- Add identity and room-merge rules:
  - Default room key should be provider-scoped first, with optional user-configured room aliasing for cross-provider merge.
  - Device IDs must become globally unique, e.g. `<provider>:<native-id>`.
  - Do not auto-merge devices across providers in v1; only merge rooms.

- Gate the first non-HA release to a curated subset:
  - Support: rooms, lights, switches, lock-like controls where backend supports them, simple sensors, selected climate/media.
  - Defer or provider-gate: HA panel mode, HA ingress-specific auth, advanced automations/tasks, recorder/energy history, HA media-source browsing, HA camera streaming, HA-specific notification/admin actions.

- Provider-specific adapter expectations:
  - Home Assistant remains the richest provider and keeps its current special deployment modes.
  - Homey adapter should map OAuth2 auth, device/zones fetch, realtime device updates, and capability-based actions.
  - OpenHAB adapter should map Items plus semantic locations when available; if semantic model is missing, degrade to flat or inferred room grouping instead of pretending parity.

## Public Interfaces / Type Changes

- Replace HA-only auth/session surface with provider-aware session types in `src/auth/`.
- Replace `homeAssistantStore` with a provider-neutral runtime store; HA-specific raw state can remain inside the HA adapter.
- Replace `useHADevices()` / `useDevices()` split with:
  - `useProviderDevices(providerId?)`
  - `useAggregatedDevices()`
  - canonical device mappers that consume provider-normalized payloads, not HA entities directly.
- Replace direct `homeAssistantService.callService(...)` usage with provider action intents, e.g. `dispatchDeviceAction({ deviceId, action, payload })`.

## Test Plan

- Adapter contract tests per provider:
  - auth success/failure, reconnect, initial load, live updates, unavailable devices, partial payloads.
- Canonical mapping tests:
  - same room name from HA and Homey merges into one room when aliasing says so.
  - same room name without aliasing stays provider-scoped if required by chosen merge policy.
  - provider-specific unsupported capability does not render a broken control.
- UI acceptance tests:
  - mixed-provider dashboard renders coherent room counts and card ordering.
  - actions route to the right provider and never cross-fire to a similarly named device from another backend.
  - removing one provider leaves the rest of the dashboard usable.
- Regression tests for HA:
  - HA panel, ingress, and standalone auth still work unchanged.
  - existing HA device categories and actions continue to map as before.

## External Constraints Verified

- Homey's current official Web API is OAuth2-based, exposes devices and realtime updates, and actions are capability-based rather than HA-style domain/service calls.
- openHAB's current official model is Item-centric with REST access and optional semantic locations; room/equipment structure is not guaranteed unless users maintain the semantic model.

## Assumptions And Defaults

- Scope assumes one Navet instance aggregates Home Assistant and Homey in the same dashboard.
- First non-HA rollout is curated subset, not feature parity.
- Home Assistant remains a first-class provider with its current panel/ingress/Docker behavior preserved.
- OpenHAB is planned against the same provider abstraction later, but not implemented until Homey proves the abstraction.
- Success means: aggregated rooms and core controls work reliably without degrading current HA support.
