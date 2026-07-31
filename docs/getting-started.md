---
title: Getting started
description: Understand Navet, choose a provider, and reach your first dashboard.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/getting-started.md
---

Navet is a local-first smart-home dashboard. It provides one visual layer for the smart-home
platform you already use; it does not replace that platform or move your home into a hosted cloud.

## Start with your provider

- **Home Assistant:** use the [Home Assistant installation guide](/install/home-assistant/).
- **Homey:** use the [Homey setup guide](/install/homey/).
- **openHAB:** use the [openHAB setup guide](/install/openhab/).
- **Development builds:** use [Navet Dev](/install/navet-dev/) when you explicitly want the newest
  in-progress build.

If you are unsure which Home Assistant route fits, compare them in
[Choose an installation](/install/).

## What happens next

After Navet connects to your provider, it loads your normalized rooms, devices, and entities into
the dashboard. Start by confirming that the expected rooms appear, then:

1. Use **Customize** on Home to reorder, resize, hide, lock, or manually add cards.
2. Try a Home layout pack or build sections and columns yourself.
3. Open **Settings -> System** to connect another supported provider. Connected providers can be
   selected together so their room and entity collections appear in the shared dashboard.
4. Use the [widget reference](/guide/widgets/) for Navet-owned content such as RSS, notes, photos,
   maps, battery summaries, and live energy.

Home Assistant currently enables the broadest set of advanced dashboards and provider services.
Read the [integration capability matrix](/integrations/) for the exact Homey and openHAB scope.

For step-by-step product help, continue with
[Your first 15 minutes with Navet](/guide/quick-start/first-15-minutes/) or browse the
[how-to guides](/guide/how-to/).

## Keep it private

Navet is designed for local use. Before exposing any smart-home interface beyond your trusted
network, read the [security guidance](/security/).
