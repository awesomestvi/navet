---
title: Assign a dashboard to a device
description: Choose which dashboard opens on each registered wall display, phone, or browser.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/dashboards/assign-to-device.md
---

Each registered browser or display can open a different Home dashboard while sharing the same
dashboard collection.

![The Assign Upstairs lights dialog showing This device, Sonoff upstairs, and Kitchen tablet, with Sonoff upstairs selected.](/docs/how-to/dashboards/assign-dashboard-devices.webp)

## Give devices useful names

1. Open **Settings → System → Connected devices**.
2. Find **This device**.
3. Choose **Rename device**.
4. Use a recognizable name such as **Kitchen iPad** or **Hallway Pi**.

Clear names make assignments and revision history easier to understand.

## Assign from dashboard management

1. Open **Settings → Dashboard → Home dashboards**.
2. Open the action menu beside a dashboard.
3. Choose **Assign devices**.
4. Select the displays and browsers that should open it.
5. Close the dialog when the correct devices are selected. Changes apply as you select or clear a
   device.

You can also create a dashboard and choose **This device** in the creation flow.

## Default versus assigned

- The **default dashboard** opens when a device has no explicit assignment.
- An **assigned dashboard** takes precedence for that device.
- Removing an assignment returns the device to the default.
- Deleting an assigned dashboard safely returns its devices to the default.

## Expected result

Reload Navet on the assigned display. It should open the chosen Home dashboard. Other sections and
provider connections remain available.

## If a device is missing

Open Navet on that browser and allow its profile to synchronize. Then return to **Connected
devices**. Local-only or offline installations may not provide shared device registration.
