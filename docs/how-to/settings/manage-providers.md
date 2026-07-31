---
title: Connect and manage providers
description: Add an implemented provider, make one active, or disconnect a browser-specific session.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/settings/manage-providers.md
---

Standalone Navet can retain sessions for multiple implemented providers and combine selected
provider collections. One active provider still supplies operations that require a single advanced
feature service.

![System settings showing connected and available providers.](/docs/how-to/settings/provider-management.webp)

## Connect a provider

1. Open **Settings → System → Providers**.
2. Expand provider management when it is collapsed.
3. Choose **Connect**.
4. Complete the provider-specific flow:
   - Home Assistant uses the supported sign-in flow for the current deployment.
   - Homey uses its OAuth connection.
   - openHAB uses a reachable base URL and credentials.

Do not paste a long-lived Home Assistant token into a manual token field; Navet does not use that
as its connection model.

## Choose the active provider

When more than one provider is connected, choose **Make active** for the provider that should
supply single-provider operations. Selected provider entities can still appear together in shared
collections.

## Disconnect

Choose **Disconnect** on the provider card and confirm. This ends that provider session on the
current device or server scope. It does not delete devices from the provider.

## Availability

Home Assistant supplies Navet's broadest advanced feature set. Homey and openHAB currently focus on
rooms, live entities, lighting, switches, and sensors. Hubitat and SmartThings are planned, not
implemented runtimes.

See [A feature is unavailable](/guide/troubleshooting/unavailable-features/).
