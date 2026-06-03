# Navet Home Assistant Add-on

This add-on serves Navet through Home Assistant Ingress.
This directory is the monorepo source for the add-on published from `awesomestvi/navet`.

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fawesomestvi%2Fnavet)

## Current Behavior

- pulls a prebuilt container image published by CI
- uses the authenticated Home Assistant Ingress session when opened from the sidebar
- does not require manual Home Assistant URL or token entry
- supports optional `dashboard_config_url` import on first launch
- keeps the direct host port disabled by default

If the optional direct port is opened outside Ingress, Navet behaves like the standalone runtime
and uses OAuth login instead of the Ingress session.

## Install

1. Open `Settings -> Add-ons -> Add-on Store`.
2. Open the repository menu and choose `Repositories`.
3. Add `https://github.com/awesomestvi/navet`.
4. Install `Navet`.

## Configuration

- `dashboard_config_url`: optional Navet dashboard config import URL for first launch
- `homey_client_id`: optional Athom Web API client ID for Homey login from the add-on
- `homey_client_secret`: optional Athom Web API client secret for Homey login from the add-on
- `homey_redirect_uri`: optional exact Homey OAuth callback URL override when the add-on cannot infer the public ingress URL correctly
