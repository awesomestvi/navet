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
