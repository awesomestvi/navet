# Navet For HACS

This repository contains only the Home Assistant HACS integration packaging for Navet.
It intentionally excludes `repository.yaml` and all Home Assistant add-on packaging files.

![Navet dashboard demo on iPad frame](https://raw.githubusercontent.com/awesomestvi/navet/main/assets/reference/marketing/use-cases/navet-ipad-frame-dashboard.jpg)

Install with HACS:

1. Add `https://github.com/awesomestvi/navet-hacs` as a custom repository with category
   `Integration`.
2. Install `Navet`.
3. Restart Home Assistant.
4. Add the `Navet` integration from `Settings -> Devices & services`.
5. Open Navet from the Home Assistant sidebar.

Navet source, docs, issues, and release workflow live in the main monorepo:

- source: `https://github.com/awesomestvi/navet`
- docs: `https://github.com/awesomestvi/navet/blob/main/docs/HOME_ASSISTANT.md`
- issues: `https://github.com/awesomestvi/navet/issues`

This repository is generated from `platform/home-assistant/custom_components/navet/` in the
monorepo. Run `pnpm sync:hacs` from the monorepo to refresh it.
