---
title: Install and add your first card
description: Install the Navet Cards resource in Home Assistant and configure a light card.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/installation.md
---

You need Home Assistant 2024.6.4 or newer, a dashboard you can edit, and access to
Home Assistant's configuration files. Navet Cards is an early beta.

## Install the resource

1. Open [Navet Cards Releases](https://github.com/navet-app/navet-cards/releases), choose a release,
   read its notes, expand **Assets**, and download **navet-cards.js**.
   Dev, beta, and release-candidate builds are marked **Pre-release**.
2. Copy the file into `/config/www/`. If you create `www` for the first time, restart Home Assistant.
3. Open your dashboard, choose **Edit dashboard**, open its menu, and choose **Manage resources**.
   Enable **Advanced mode** in your Home Assistant profile if this option is hidden.
4. Add `/local/navet-cards.js?v=VERSION` as a **JavaScript Module**. Replace `VERSION` with
   the downloaded release version. Keep one resource entry for Navet Cards.
5. Refresh the dashboard in your browser.

For dashboards with a YAML-managed resource list, add this to the resource configuration:

```yaml
resources:
  - url: /local/navet-cards.js?v=VERSION
    type: module
```

See Home Assistant's [dashboard resource documentation](https://www.home-assistant.io/dashboards/dashboards/#resources)
for resource configuration and storage versus YAML mode.

## Add your first card

1. Choose **Edit dashboard**, then **Add card**.
2. Search for **Navet** and choose the light card.
3. Select a light entity, give it a recognizable name, and choose **Save**.
4. Finish dashboard editing. Try its on/off control and any supported brightness control.

For a YAML card, replace `light.kitchen` with an entity from your Home Assistant installation:

```yaml
type: custom:navet-light-card
entity: light.kitchen
name: Kitchen lights
layout: compact
```

Find entity IDs in Home Assistant under **Settings → Devices & services → Entities**.
If the picker is empty or the card does not appear, follow [troubleshooting](/cards/troubleshooting/).

Next, [build a room dashboard](/cards/rooms/) or [choose a layout](/cards/appearance/).
