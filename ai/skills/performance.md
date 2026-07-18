# Performance

Read this file before changing rendering, animations, dashboard update flow, or dependencies.

## Runtime Assumption

Assume Navet may run on Raspberry Pi-class kiosk hardware.

## Rules

- avoid unnecessary re-renders
- keep frequent provider updates from forcing broad tree churn
- be careful with blur, layered visual effects, and always-running animation
- prefer lazy loading and narrow selectors over broad subscriptions
- avoid adding dependencies without strong justification

## Effects Quality

- preserve the current `effectsQuality`, low-power, reduced-motion, and device-tier decisions
  rather than adding a feature-local performance toggle
- high quality may keep richer theme-native effects on capable devices
- medium quality should reduce blur, layered shadows, animated gradients, and large paint regions
  while preserving hierarchy and interaction
- low quality should favor opaque surfaces, static state changes, lean DOM, and predictable paint
  cost
- quality modes may change rendering cost, not information access, control availability, contrast,
  or layout meaning

## UI Review

For a new or substantially reshaped always-visible surface, check:

- whether provider updates rerender only the cards or regions whose data changed
- whether offscreen or expensive work can remain lazy
- whether animation stops under reduced motion and whether the interaction remains understandable
- whether the surface remains visually coherent when backdrop blur and decorative layers are
  reduced
- whether mobile and kiosk layouts avoid oversized DOM trees, nested scroll regions, and large
  fixed paint areas

## Current Hotspots

- `packages/provider-homeassistant/`
- `packages/provider-homey/`
- `packages/provider-openhab/`
- `packages/app/src/features/dashboard/`
- `packages/app/src/features/media/`
- `packages/app/src/features/security/`
- `packages/app/src/hooks/`
- `packages/app/src/stores/`
- `packages/app/src/infrastructure/home-assistant/` (legacy compatibility seam)
