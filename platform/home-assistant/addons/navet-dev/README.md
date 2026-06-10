# Navet Dev Home Assistant Add-on

This add-on serves the current development image of Navet through Home Assistant Ingress.
This directory is the monorepo source for the add-on published from `awesomestvi/navet`.

## Current Behavior

- pulls the current dev `Navet Dev` add-on image published from every `main` push
- uses the authenticated Home Assistant Ingress session
- does not require manual Home Assistant URL or token entry
- supports optional `dashboard_config_url` import on first launch
- exposes a changing dev add-on version so Home Assistant can detect updates

Published image tag shape:

```text
ghcr.io/awesomestvi/{arch}-navet-addon:0.x.y-dev.YYYYMMDDHHMMSS
```

Before pushing `main`, run `pnpm release:dev-version` so `platform/home-assistant/addons/navet-dev/config.yaml`
contains a fresh dev version. Each push to `main` publishes that committed dev version and refreshes
the `dev` and `edge` tags as moving aliases for that same image.

If opened outside Ingress through an optional direct port, Navet behaves like the standalone
runtime and uses OAuth login instead.

## Install

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet` as an Add-on Store repository.
4. Install `Navet Dev`.

## Configuration

- `dashboard_config_url`: optional Navet dashboard config import URL for first launch
