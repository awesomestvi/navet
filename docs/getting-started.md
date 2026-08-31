---
title: Getting started
description: Understand Navet, choose a provider, and reach your first dashboard.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/getting-started.md
---

Navet is a local-first smart-home dashboard. It provides one visual layer for the smart-home
platform you already use; it does not replace that platform or move your home into a hosted cloud.

## Choose an installation

- **Home Assistant:** use the [Home Assistant installation guide](/install/home-assistant/). Choose
  the HACS custom panel if you already use HACS, the Home Assistant App when Home Assistant OS
  should run Navet, or standalone Docker when you manage containers yourself.
- **Homey:** use the [Homey setup guide](/install/homey/).
- **openHAB:** use the [openHAB setup guide](/install/openhab/).
- **Development builds:** use [Navet Dev](/install/navet-dev/) when you explicitly want the newest
  unfinished changes and accept that they can break more often than a normal release.

With standalone Docker, browsers can use a LAN address at home or a VPN, Tailscale, or external
address while away. After the first trusted Home Assistant server is approved, each browser
address does not need separate provider pairing.

## After Navet opens

Check that your rooms and devices appear. Then try these steps:

1. Use **Customize** on Home to reorder, resize, hide, lock, or manually add cards.
2. Try a Home layout pack or build sections and columns yourself.
3. Use the [widget reference](/guide/widgets/) for Navet-owned content such as RSS, notes, photos,
   maps, battery summaries, and live energy.

For step-by-step product help, continue with
[Your first 15 minutes with Navet](/guide/quick-start/first-15-minutes/) or browse the
[how-to guides](/guide/how-to/).

## Keep it private

Navet is designed for local use. Before exposing any smart-home interface beyond your trusted
network, read the [security guidance](/security/).
