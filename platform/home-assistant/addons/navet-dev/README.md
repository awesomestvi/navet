# Navet Dev Home Assistant Add-on

This add-on serves the current development image of Navet through Home Assistant Ingress.
This directory is the monorepo source for the add-on published from `awesomestvi/navet`.

## Current Behavior

- pulls the current dev `Navet Dev` add-on image published from the Navet Dev workflow
- uses the authenticated Home Assistant Ingress session
- does not require manual Home Assistant URL or token entry
- supports optional `dashboard_config_url` import on first launch
- refreshes the moving `dev` and `edge` image tags on each Navet Dev publish

Published image tag shape:

```text
ghcr.io/awesomestvi/{arch}-navet-addon:0.x.y-dev.YYYYMMDDHHMMSS
```

`platform/home-assistant/addons/navet-dev/config.yaml` is channel metadata, not the immutable
Navet Dev release source of truth. Immutable dev publishes use workflow-generated versions in the
form `0.x.y-dev.YYYYMMDDHHMMSS` and matching `navet-dev-*` tags. Use `pnpm release:dev-version`
only when you intentionally need to refresh the repository metadata outside that publish flow.
Each Navet Dev publish refreshes the `dev` and `edge` tags as moving aliases for that same image
and advances `config.yaml` on `main` so Home Assistant supervised installs see the new version.
The same local `pnpm release:dev-publish` flow also rewrites the `## In Progress` section in
`CHANGELOG.md` from the latest relevant release baseline: it uses the most recent `navet-dev-*`
tag unless a newer stable `v*` tag exists, then folds in current committed, staged, and
in-progress worktree scope.

If you want an immutable Navet Dev publish, the local helper command is:

```bash
pnpm release:dev-publish
```

It creates the matching tag from the current `HEAD` in this format:

```text
navet-dev-0.x.y-dev.YYYYMMDDHHMMSS
```

That tag triggers a dedicated workflow which publishes exact-version dev images, creates the
matching metadata commit on `main`, and creates a GitHub prerelease while also refreshing the
moving `edge` and `dev` aliases. The local helper mirrors that behavior. Add `-- --push` to push
the commit and tag.

If opened outside Ingress through an optional direct port, Navet behaves like the standalone
runtime and uses OAuth login instead.

## Install

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet` as an Add-on Store repository.
4. Install `Navet Dev`.

## Configuration

- `dashboard_config_url`: optional Navet dashboard config import URL for first launch
