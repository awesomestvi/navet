---
title: Understand Home insights and smart features
description: Learn how Navet's private, local suggestions work in supported installations.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/navet-ai.md
---

Home insights find repeated usage patterns and unusual home activity, then present short,
evidence-backed observations. Pattern learning is strictly read-and-suggest: Navet never acts
automatically, triggers a routine, creates an automation, or sends a notification. A direct device
command that you explicitly submit in Assist can be carried out through the device's connected
provider.

## Supported installations

Smart features run in the standalone Docker app and Home Assistant add-on. They are not offered in
the browser-only Home Assistant custom panel because that runtime has no installation-owned service
or database.

For local development, `pnpm dev` starts Navet's private local service automatically and exposes it
through the existing `http://navet.local:5200` authenticated origin. No second Navet installation,
pairing flow, or AI connection step is required. Set `NAVET_AI_MEMORY_GB=8` before starting the dev
server when you want to exercise the Raspberry Pi 5 8 GB model-selection profile.

## Learning and generation

Behavior learning is off by default. If you enable it, Navet observes supported state changes from
that moment while the dashboard is open. Importing up to 30 days of provider history is a separate,
unselected choice. Deterministic detectors establish the evidence. Observations are generated each
day at 05:30 and can also be refreshed from **Home insights**.

Raw observations are retained for 30 days. Daily aggregates are retained for 12 months in an
installation-local SQLite database.

## Optional local model

Pattern detection works before a model is installed. With explicit consent, Navet downloads a
local Qwen model selected for the available memory: the 0.8B tier on a 4 GB Raspberry Pi 5, and the
2B tier when memory permits. The model only ranks and explains verified detector evidence. Navet
rejects narration containing device-control or automation language.

Home priorities do not require a model. Deterministic rules decide which verified security,
household, weather, calendar, maintenance, or energy exceptions qualify and assign an immutable
urgency group. When the local model is ready, it may reorder only equally urgent candidates. The
ranking request contains at most 12 opaque, request-local tokens plus categorical reason, time, and
explicit-feedback counts. It excludes provider and canonical IDs, credentials, calendar titles,
notification text, camera or audio content, presence history, and other free-form household text.
Invalid, late, or unavailable model output is ignored without delaying Home.

Home shows at most three priorities above its summary bar and never changes the saved dashboard
layout. Opening a priority navigates to its source; it does not carry out a device action. Active
critical safety items cannot be dismissed. This provider-neutral feed also records expiry and a
shared-display privacy policy so a future screensaver can reuse it without exposing private detail.
Screensaver behavior is not part of the current feature.

While the model downloads, Navet shows progress from the bytes written to installation storage.
You can cancel the download at any time; Navet aborts the transfer, removes the partial model, and
continues providing deterministic observations without it.

Settings shows the installed model family, quantization, size, license, and storage owner. Removing
the model deletes only the model file and download consent; learned observations and deterministic
insights remain available.

## Chat in Assist

Open **Assist** and use the assistant selector in the message composer to switch between **Home
Assistant** and **Navet Assist**. Navet Assist carries out an explicit imperative request such as “turn on
the office lights” or “turn off the desk lamp” through Navet's provider-neutral command path. It
reports which devices changed and any targets that failed. Questions and advisory requests remain
suggestions and do not change devices.

Navet recognizes on/off commands for lights and switches and can answer current-temperature
questions for a named room. Temperature answers use only available temperature sensors and current
climate readings in Navet's normalized entity snapshot. Navet sends only a small, sanitized device
context to the local model: device name, room, type, provider, and the relevant current state. The
local AI service remains unable to call a provider; the authenticated Assist client executes only a
validated direct command from the current user message.

## Private data boundary

Camera and audio content, credentials, tokens, and free-form private text are excluded from model
ranking. Calendar and notification priorities use generic summaries unless private details are
explicitly enabled. Behavior learning stores only a fixed observation schema for supported
lighting and switch transitions, presence changes, and hourly maximum power observations.

Open **Smart features** in app settings to inspect the selected model, learning choices, retention
policy, explicit priority feedback, and data boundary. Priority feedback can be deleted
independently. The master control turns off every smart feature and permanently deletes the
downloaded model, learned observations, aggregates, feedback, priority choices, and generated
insights. Smart features can be enabled again later, but deleted data and models are not restored
automatically.

The local database and optional AI model are installation-owned files restricted to the service
process user.
The gateway still requires an authenticated Navet session and same-origin mutations. Local
processing prevents cloud disclosure; it cannot make a compromised host, administrator account,
browser session, or backup trustworthy. Protect the host and expose only the provider context the
household actually needs.

When upgrading from Local Habits, existing local evidence remains inactive while learning is off.
Navet migrates eligible historical events and safe feedback only after learning is explicitly
enabled. It never migrates old rules or actions, and it does not modify Home Assistant automations.
