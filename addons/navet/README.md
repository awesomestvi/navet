# Navet Home Assistant Add-on

This add-on serves Navet through Home Assistant Ingress.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fawesomestvi%2Fnavet)

## Current Behavior

- pulls a prebuilt container image published by CI
- uses the authenticated Home Assistant Ingress session when opened from the sidebar
- does not require manual Home Assistant URL or token entry
- supports optional `dashboard_config_url` import on first launch
- keeps the direct host port disabled by default

If the optional direct port is opened outside Ingress, Navet behaves like the standalone runtime
and uses OAuth login instead of the Ingress session.

## Configuration

- `dashboard_config_url`: optional Navet dashboard config import URL for first launch

## Returning Users

Legacy add-on options such as old `hass_url` and `token` values may still exist in stored add-on
configuration during upgrades, but Navet does not use them anymore.
