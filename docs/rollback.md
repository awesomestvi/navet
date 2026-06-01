# Rollback

Navet release rollback is artifact-based. Do not rely on `latest` as the rollback mechanism.

## Docker

Prefer exact image tags in production:

- `ghcr.io/awesomestvi/navet:v0.x.y`
- or a pinned image digest

Rollback options:

1. change the deployed image tag back to the previous known-good release
2. redeploy the previous digest if your environment pins digests
3. restart the container after the image change

Example:

```yaml
services:
  navet:
    image: ghcr.io/awesomestvi/navet:v0.4.1
```

## Home Assistant Add-on

Rollback the add-on by moving back to the previous published release image for the matching
architecture.

If the repository metadata or UI still points at a newer version, use the previous GitHub release
to identify the earlier exact add-on image tag and redeploy that version explicitly.

## Home Assistant Custom Panel

Rollback by reinstalling the previous GitHub release or previously committed custom panel asset
bundle.

Because the panel assets are committed into the repo, the authoritative rollback point is the
earlier release commit and tag, not the current `main` branch tip.

## Demo, Storybook, Website

These are continuous `main` surfaces, not versioned production artifacts in phase 1.

If a Pages deployment must be reverted, redeploy the earlier known-good commit rather than treating
Pages as the user rollback channel for runtime installs.

## Operator Guidance

- keep a record of the last known-good stable tag
- prefer exact Docker tags or digests in production setups
- verify Home Assistant ingress, panel, and add-on behavior after every rollback
- update release notes or follow-up docs if users need a public rollback recommendation
