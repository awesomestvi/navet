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

- `src/providers/`
- `src/app/features/dashboard/`
- `src/app/features/media/`
- `src/app/features/security/`
- `src/app/hooks/`
- `src/app/stores/`
- `src/app/infrastructure/home-assistant/`
