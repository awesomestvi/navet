---
title: Add notes, photos, and RSS feeds
description: Place lightweight household content on a Home or room dashboard.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/notes-photos-rss.md
---

Notes, photo frames, and RSS feeds are Navet widgets. They are saved with the dashboard profile and
included in configuration export.

![The widget chooser with Note, Photo, and RSS selected.](/docs/how-to/everyday-control/content-widget-chooser.webp)

## Add a note

1. Enter Home edit mode and choose **Add card → Widgets**.
2. Choose **Note**.
3. Enter a title and concise household text.
4. Choose a supported size and placement.
5. Save.

## Add a photo frame

Choose **Photo**, then select or enter the available image sources. Use images you are allowed to
display and that the browser can reach.

## Add an RSS feed

1. Choose **RSS**.
2. Enter the feed address.
3. Choose how many items to show where available.
4. Save and wait for Navet's same-origin proxy to load the feed.

![A note, photo frame, and RSS card together on Home.](/docs/how-to/everyday-control/content-widgets-result.webp)

## If an external source fails

- Confirm that the address uses `http` or `https`.
- Check that the source is reachable from the Navet server.
- Authenticated or expiring image links may not be suitable for a persistent photo frame.
- A feed can reject server requests or return invalid RSS.

Use the card's fallback state instead of repeatedly adding duplicate widgets.
