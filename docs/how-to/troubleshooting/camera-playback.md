---
title: Camera does not play live video
description: Check camera state, live-stream settings, direct URLs, and playback fallback behavior.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/troubleshooting/camera-playback.md
---

Camera capability flags alone do not guarantee that a live offer or stream will succeed. Navet
tries the supported playback plan and preserves a snapshot or error state when live playback fails.

![A camera card showing an unavailable live stream while retaining its snapshot.](/docs/how-to/troubleshooting/camera-error.webp)

## Check the basics

1. Confirm that the camera is available in the provider.
2. Verify that its snapshot updates.
3. Open **Settings → Interaction** and review camera live-stream behavior.
4. Reload the camera once.

## Review camera settings

Open the camera settings dialog and check:

- Preferred playback mode.
- A configured direct-stream URL, when your setup requires one.
- Whether the URL is reachable from the browser running Navet.

![Camera settings with playback preference and direct-stream URL.](/docs/how-to/troubleshooting/camera-stream-settings.webp)

## Understand fallback

Depending on provider support, Navet can try WebRTC, MSE, HLS, or MJPEG paths. A failed direct
WebRTC offer should fall back rather than pretending that live playback is active.

## Deployment checks

- Panel and Ingress paths can require Home Assistant resource rewriting.
- Standalone mode can require Navet's same-origin proxy.
- Authenticated, signed, relative, and expiring URLs cannot be treated as ordinary public links.
- A go2rtc endpoint must be reachable from the browser or server path that actually uses it.

## Collect useful support details

Record the Navet version, installation mode, camera entity, preferred playback mode, exact visible
error, and whether snapshots work. Do not include credentials or signed URLs in a public report.
