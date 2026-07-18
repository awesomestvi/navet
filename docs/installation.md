---
title: Choose an installation
description: Compare supported ways to run Navet and pick the route that matches your smart-home provider.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/installation.md
---

The right installation depends on the provider that already runs your home and how closely you want
Navet integrated with it.

| Route | Best for | What to expect |
|---|---|---|
| [Home Assistant custom panel](/install/home-assistant/) | A Navet entry inside Home Assistant | Home Assistant hosts the panel integration. |
| [Home Assistant add-on](/install/home-assistant/) | Home Assistant OS users who prefer an add-on | Navet runs as an add-on and opens through Ingress. |
| [Home Assistant standalone Docker](/install/home-assistant/) | Independent hosting and container workflows | You operate Navet as its own web application and connect Home Assistant with OAuth. |
| [Homey](/install/homey/) | Homey users | Navet connects through the Homey provider flow. |
| [openHAB](/install/openhab/) | openHAB users | Navet connects to your openHAB instance. |
| [Navet Dev](/install/navet-dev/) | Testing unreleased builds | Faster updates with higher change risk. |

## Recommended starting point

If you use Home Assistant, begin with its guide and choose between the custom panel, add-on, and
standalone routes based on where you want Navet to run. Use Navet Dev only when you intentionally
want to test development builds.

Homey and openHAB are standalone provider flows. A standalone installation can retain multiple
provider sessions and combine selected providers in the dashboard, but each provider contributes
only the capabilities listed in the [integration matrix](/integrations/).
