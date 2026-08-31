---
title: Understand Navet AI observations
description: Learn how private, read-only pattern observations work in supported Navet installations.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/navet-ai.md
---

Navet AI finds repeated usage patterns and unusual home activity, then presents short,
evidence-backed observations. Pattern learning is strictly read-and-suggest: Navet AI never acts
automatically, triggers a routine, creates an automation, or sends a notification. A direct device
command that you explicitly submit in Assist can be carried out through the device's connected
provider.

## Supported installations

Navet AI runs in the standalone Docker app and Home Assistant add-on. It is not offered in the
browser-only Home Assistant custom panel because that runtime has no installation-owned service or
database.

For local development, `pnpm dev` starts a private Navet AI service automatically and exposes it
through the existing `http://navet.local:5200` authenticated origin. No second Navet installation,
pairing flow, or AI connection step is required. Set `NAVET_AI_MEMORY_GB=8` before starting the dev
server when you want to exercise the Raspberry Pi 5 8 GB model-selection profile.

## Learning and generation

Navet observes supported state changes while the dashboard is open and requests up to 30 days of
provider history when available. Deterministic detectors establish the evidence. Observations are
generated each day at 05:30 and can also be refreshed from the **Navet AI** section.

Raw observations are retained for 30 days. Daily aggregates are retained for 12 months in an
installation-local SQLite database.

## Optional local model

Pattern detection works before a model is installed. With explicit consent, Navet downloads a
local Qwen model selected for the available memory: the 0.8B tier on a 4 GB Raspberry Pi 5, and the
2B tier when memory permits. The model only ranks and explains verified detector evidence. Navet
rejects narration containing device-control or automation language.

While the model downloads, Navet shows progress from the bytes written to installation storage.
You can cancel the download at any time; Navet aborts the transfer, removes the partial model, and
continues providing deterministic observations without it.

Settings shows the installed model family, quantization, size, license, and storage owner. Removing
the model deletes only the model file and download consent; learned observations and deterministic
insights remain available.

## Chat in Assist

Open **Assist** and use the assistant selector in the message composer to switch between **Home
Assistant** and **Navet AI**. Navet AI carries out an explicit imperative request such as “turn on
the office lights” or “turn off the desk lamp” through Navet's provider-neutral command path. It
reports which devices changed and any targets that failed. Questions and advisory requests remain
suggestions and do not change devices.

The first version recognizes on/off commands for lights and switches. Navet sends only a small,
sanitized device context to the local model: device name, room, type, provider, and current on/off
state. The local AI service remains unable to call a provider; the authenticated Assist client
executes only a validated direct command from the current user message.

## Private data boundary

Camera and audio content, credentials, tokens, and free-form private text are excluded. Navet AI
stores only a fixed observation schema for supported lighting and switch transitions, presence
changes, and hourly maximum power observations.

Open **Settings → Navet AI** to inspect the selected model, retention policy, and data boundary.
Resetting Navet AI deletes learned observations, aggregates, feedback, and generated insights, but
keeps the downloaded model.

When upgrading from Local Habits, Navet migrates eligible historical events and safe feedback only.
It never migrates old rules or actions, and it does not modify Home Assistant automations.
