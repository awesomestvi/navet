# Navet Dev Home Assistant Add-on

This add-on serves the current development image of Navet through Home Assistant Ingress.

## Current Behavior

- pulls the `dev` add-on image published by CI
- uses the authenticated Home Assistant Ingress session
- does not require manual Home Assistant URL or token entry
- supports optional `dashboard_config_url` import on first launch

Published image tag shape:

```text
ghcr.io/awesomestvi/{arch}-navet-addon:dev
```

If opened outside Ingress through an optional direct port, Navet behaves like the standalone
runtime and uses OAuth login instead.

## Configuration

- `dashboard_config_url`: optional Navet dashboard config import URL for first launch
