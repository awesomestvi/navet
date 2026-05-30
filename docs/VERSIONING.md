# Versioning

Maintainer reference. This file describes Navet's release line and versioning policy rather than
normal product usage.

Navet currently uses pre-`1.0` semantic versioning.

## Current Line

- current version: `0.4.0`
- current phase: public beta
- shared release line: standalone app, custom panel, and add-on ship from the same tagged version

## Scheme

- `0.x.y` for beta releases
- `0.x.y-beta.n` for prerelease milestones
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
- `src/app/constants/app-version.ts` is the app-facing version surface
- `CHANGELOG.md` tracks released history

## Release Notes Rule

Keep historical changelog entries intact. When release framing changes, update the top-level current
version references rather than rewriting older release notes.
