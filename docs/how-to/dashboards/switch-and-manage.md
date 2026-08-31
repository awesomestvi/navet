---
title: Switch and manage dashboards
description: Open, rename, duplicate, order, default, assign, or delete Home dashboards.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/switch-and-manage.md
---

Dashboard management changes the collection of Home dashboards. It does not change the main
Energy, Climate, Security, Lights, Media, Household, or Settings sections.

![The dashboard switcher listing two focused Home dashboards.](/docs/how-to/dashboards/dashboard-switcher.webp)

## Switch dashboards

1. Open the dashboard switcher from Home or the room navigation.
2. Choose the dashboard you want to preview.
3. Choose **Use on this device** if it should become the default for the current browser.

Opening a dashboard temporarily and assigning it to a device are different actions.

## Open the manager

Choose **Manage dashboards**, or open **Settings → Dashboard → Home dashboards**.

![Home dashboards with the action menu open.](/docs/how-to/dashboards/dashboard-manager-actions.webp)

Use the action menu beside a dashboard to:

- **Open** it.
- **Rename** it.
- **Duplicate** its current Home layout.
- **Move up** or **Move down** in the switcher.
- **Make default** for devices without a specific assignment.
- **Assign devices**.
- **Delete** it.

## Assign a dashboard to devices

Give each important browser or display a recognizable name under
**Settings → System → Connected devices** first. Names such as **Kitchen iPad** or **Hallway Pi**
make assignments and revision history easier to understand.

1. Open **Settings → Dashboard → Home dashboards**.
2. Open the action menu beside a dashboard and choose **Assign devices**.
3. Select the displays and browsers that should open it.
4. Close the dialog when the correct devices are selected. Changes apply as devices are selected
   or cleared.

The workspace default opens when a device has no explicit assignment. An assignment takes
precedence for that device; removing it returns the device to the default. You can also assign
**This device** while creating a dashboard.

If a device is missing, open Navet in that browser and allow its profile to synchronize, then
return to **Connected devices**. Local-only or offline installations may not provide shared device
registration.

## Delete a dashboard safely

Navet always keeps at least one dashboard. When deleting another dashboard:

1. Review the dashboard name.
2. Confirm **Delete**.
3. Devices assigned to it move safely to the default dashboard.

Deletion cannot be undone. Export a backup first if you may need the layout later.

## If a dashboard URL no longer works

When a dashboard has been removed, Navet shows the default dashboard and reports that the requested
dashboard is no longer available.
