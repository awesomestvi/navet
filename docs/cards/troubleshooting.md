---
title: Updates and troubleshooting
description: Update or roll back Navet Cards and diagnose resource, entity, and control problems.
editUrl: https://github.com/navet-app/navet/edit/main/docs/cards/troubleshooting.md
---

## Update the resource

1. Read the selected [release notes](https://github.com/navet-app/navet-cards/releases).
2. Save a copy of your current `navet-cards.js` and back up your Home Assistant dashboard configuration.
3. Download the new `navet-cards.js` and replace `/config/www/navet-cards.js`.
4. In **Manage resources**, update the existing resource URL to
   `/local/navet-cards.js?v=NEW_VERSION`, using the downloaded version.
5. Reload every browser and companion-app frontend that displays the dashboard.
6. Check your cards and their common controls.

Home Assistant retains the dashboard card configuration. To roll back, restore the previous
JavaScript file and its versioned resource URL, then reload each frontend. Restore the backed-up
configuration if you also changed fields that the previous version does not support.

## Cards are missing from the picker

- Confirm that `/config/www/navet-cards.js` exists. The browser path is `/local/navet-cards.js`.
- Open that browser path on your Home Assistant origin and confirm it returns JavaScript.
- Check that the resource type is **JavaScript Module** and that only one Navet Cards resource is registered.
- Enable **Advanced mode** in your profile if **Manage resources** is hidden.
- Restart Home Assistant if you created `www` for the first time, then refresh the browser.

If Home Assistant reports a missing custom element, verify the spelling against the
[card reference](/cards/reference/), such as `custom:navet-light-card`.

## A card shows an unknown or unavailable entity

Find the entity in **Settings → Devices & services → Entities** and verify its ID and state.
Use an entity domain supported by the card. A room with missing membership can use an
[explicit entity list](/cards/rooms/#choose-room-members-yourself).

## A control is absent or fails

Controls follow the entity's supported capabilities. Open Home Assistant entity details
and try the same action there. Confirm the account has permission to control the entity.
For a configured action, verify `perform_action`, the target, and any action data.

Light color and code-protected locks use Home Assistant entity details. A weather forecast
requires a weather entity that supplies daily forecasts; Energy Now history requires recorded
power-sensor history. An unavailable history source is explained on the card.

## The layout is clipped

Choose a suitable [layout](/cards/appearance/) and allow enough rows in Home Assistant Sections.
Use `rows: auto` for expanded disclosures or sub-controls. Check the same view at the target
phone or wall display size.

## Report a problem

Use [Cards Issues](https://github.com/navet-app/navet-cards/issues/new/choose) and include:

- Navet Cards release version and Home Assistant version.
- Browser or companion app and screen size.
- A minimal card configuration and steps to reproduce.
- Relevant browser errors, with credentials and household details removed.

For setup help, use [Cards Discussions](https://github.com/navet-app/navet-cards/discussions).
