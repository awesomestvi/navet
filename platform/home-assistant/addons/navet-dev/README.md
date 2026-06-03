# Navet Dev Home Assistant Add-on

This add-on serves the current development image of Navet through Home Assistant Ingress.
This directory is the monorepo source for the add-on published from `awesomestvi/navet`.

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

## Install

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet`.
4. Install `Navet Dev`.

## Configuration

- `dashboard_config_url`: optional Navet dashboard config import URL for first launch
