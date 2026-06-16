# Versioning

Maintainer reference. This file describes Navet's release line and versioning policy rather than
normal product usage.

Navet currently uses pre-`1.0` semantic versioning.

## Current Line

- current version: `0.7.6`
- current phase: public beta
- shared release line: standalone app, custom panel, and add-on ship from the same tagged version
- release channels: `edge` and `dev` from Navet Dev publishes, versioned dev tags as `0.x.y-dev.YYYYMMDDHHMMSS`, `beta` from prerelease tags, `latest` from stable tags

## Scheme

- `0.x.y` for stable beta-line releases
- `0.x.y-beta.n` for prerelease milestones
- `0.x.y-rc.n` for release candidates
- `0.x.y-dev.YYYYMMDDHHMMSS` for immutable Navet Dev publish versions
- `1.0.0` only when compatibility expectations are stable enough for a major stable line

## Bump Rules

- `patch`
  - bug fixes
  - focused polish
  - docs-only corrections tied to released behavior
- `minor`
  - user-visible features
  - new cards, widgets, settings, or meaningful runtime behavior
  - deployment or provider features that change what users can do
- `prerelease`
  - testable beta milestones before a general release

## Source Of Truth

- `package.json` is the canonical app version
- `packages/app/src/constants/app-version.ts` is the app-facing version surface
- `CHANGELOG.md` tracks released history
- immutable Navet Dev versions are promoted by creating and pushing a matching `navet-dev-*` tag
- Home Assistant supervised detects Navet Dev updates from the committed `platform/home-assistant/addons/navet-dev/config.yaml` metadata on `main`
- HACS updates remain stable-only and are not part of Navet Dev publishes

## Release Notes Rule

Keep historical changelog entries intact. When release framing changes, update the top-level current
version references rather than rewriting older release notes.
