---
title: Use Home Assistant Assist from Navet
description: Open Home Assistant Assist from Navet, choose a pipeline, and use text or microphone input.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/how-to/everyday-control/home-assistant-assist.md
---

Navet can open Home Assistant Assist without leaving the dashboard. You can type a request, use
the microphone when the selected pipeline supports speech-to-text, and hear response audio when
the pipeline supplies it.

Assist is currently a Home Assistant capability. It is not registered for Homey or openHAB.

## Before you start

- Connect Home Assistant and confirm that Navet shows it as available.
- Configure at least one Assist pipeline in Home Assistant.
- For voice input, allow microphone access in the browser or installed PWA.
- Choose a pipeline with speech-to-text support if you want to speak instead of type.

If Navet cannot reach Home Assistant, the Assist action is unavailable until the provider
reconnects.

## Open Assist from navigation

1. Open any Navet dashboard section.
2. Select **Open Assist** in the dashboard header.
3. Use the **Assistant** selector to choose one of the pipelines reported by Home Assistant.
4. Type a request in **Ask Assist…**, then send it.
5. Keep the conversation open for follow-up requests when the pipeline supports them.

Navet starts with Home Assistant's preferred pipeline when one is available. Otherwise, it uses
the first pipeline returned by Home Assistant.

## Add Assist to a dashboard

1. Edit the Home dashboard.
2. Add the **Assist** custom card.
3. Open the card settings and choose the Home Assistant pipeline the card should use.
4. Save the dashboard.
5. Select the card whenever you want to open the Assist conversation.

The card can keep its own pipeline selection. The navigation action remembers its selection for
the current app session.

## Use the microphone

1. Open Assist and select a pipeline that supports speech-to-text.
2. Select **Start listening** and approve the browser's microphone prompt if it appears.
3. Speak the request.
4. Select **Stop listening** when you are finished.

The microphone control stays disabled when the browser cannot provide microphone capture or the
selected pipeline does not support speech-to-text. A secure browser context may be required for
microphone permission, depending on how Navet is installed and opened.

## If Assist is unavailable

- Confirm that Home Assistant is connected in **Settings → Providers**.
- Check that Home Assistant has at least one Assist pipeline.
- Reopen Assist after changing pipelines in Home Assistant.
- Check the browser's site permissions when microphone capture fails.
- Try a text request to separate pipeline connectivity from microphone permission problems.

Navet passes the request to the selected Home Assistant Assist pipeline. Home Assistant remains
the source of truth for the exposed entities, conversation engine, speech services, and resulting
home actions.

## Provider boundary

Home Assistant currently provides Assist text, microphone, and response-audio support in Navet.
Homey and openHAB do not currently register this conversation capability. See the
[provider capability matrix](/integrations/) for the current boundary.
