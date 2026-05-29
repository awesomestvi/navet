# Provider Release Validation

This is the Tier 1 validation pass for provider and runtime changes.

## What Must Still Work

- Home Assistant in standalone OAuth mode
- Home Assistant in add-on Ingress mode
- Home Assistant in custom-panel mode
- Homey through the standalone flow
- openHAB through the standalone URL-session flow

Hubitat and SmartThings are not release blockers because they are not available runtime providers
yet.

## Automated Checks

Run these checks as the Tier 1 release-critical surface:

```bash
pnpm test:tier1
node scripts/check-provider-boundaries.mjs
pnpm check:docker
```

This is intentionally smaller than the full frontend CI surface.

## Local openHAB Demo Pass

Boot the standalone Navet shell plus openHAB:

```bash
docker compose -f docker/provider-demo.compose.yml up -d
```

Then:

1. Open `http://localhost:8080`.
2. Select `openHAB`.
3. Enter `http://localhost:8081`.
4. Confirm Navet boots, the provider session initializes, and entity loading works without Home
   Assistant-specific assumptions.

Stop the demo environment with:

```bash
docker compose -f docker/provider-demo.compose.yml down
```

## Home Assistant Manual Pass

Home Assistant ingress and panel modes still need a real Home Assistant instance.

Check:

1. Standalone Navet can connect to Home Assistant through OAuth.
2. The Home Assistant add-on opens through Ingress without a separate Navet login.
3. The Home Assistant custom panel boots from the injected frontend session.
4. Basic commands still work for lights, climate, media, locks, covers, and cameras.

If panel assets changed, include:

```bash
pnpm build:ha-panel
```

as a user-run release gate before the release commit or tag.
