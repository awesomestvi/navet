# Product Marketing Context

*Last updated: July 22, 2026*

## Product Overview

**One-liner:** Navet is a polished, local-first smart-home dashboard for Home Assistant, Homey, and openHAB across wall panels, tablets, desktops, and phones.

**What it does:** Navet turns supported smart-home platforms into one room-first interface for everyday control. It gives households glanceable dashboards for lights, climate, media, energy, security, tasks, and settings while keeping provider-specific connection and command behavior behind the shared experience.

**Product category:** Self-hosted smart-home dashboard.

**Product type:** Open-source, self-hosted web application and PWA with Home Assistant panel and add-on deployment options.

**Business model:** Community-driven open source under AGPL-3.0-only. No paid plan is documented.

## Target Audience

**Primary audience:** People who operate self-hosted smart homes and want a calmer interface across wall panels, tablets, kiosks, desktop browsers, or phones for daily control.

**Secondary audience:** Contributors, integration maintainers, and developers building provider-neutral smart-home UI. Home Assistant, Homey, and openHAB users can all belong to the primary audience; provider choice does not define audience priority.

**Primary use case:** Replace an admin-first or fragmented smart-home interface with a calmer room-first dashboard that works across household screens.

**Jobs to be done:**

- Check and control the home quickly without navigating configuration-heavy screens.
- Give household members a consistent interface across wall panels, tablets, phones, and desktops.
- Keep smart-home data and provider sessions local while using an open-source dashboard.
- Bring selected entities from more than one implemented provider into shared dashboard collections.

**Use cases:**

- A wall-mounted tablet for room control.
- A phone-friendly PWA for daily lights, climate, media, and security checks.
- A Home Assistant custom panel or add-on.
- A standalone dashboard connected to Home Assistant, Homey, openHAB, or multiple supported providers.

## Problems & Pain Points

**Core problem:** Smart-home platform interfaces often prioritize administration and configuration over fast everyday control, while custom dashboards require ongoing maintenance and may not stay consistent across screen sizes.

**Why alternatives fall short:**

- Default platform UIs can feel admin-first for household members.
- DIY dashboards can require significant setup and repeated maintenance.
- Provider-specific frontends make it harder to preserve one interaction model across platforms.
- Many dashboards are designed for one screen size rather than wall panels through phones.

**What it costs users:** Time maintaining layouts, extra navigation for common controls, and inconsistent household experiences.

**Emotional tension:** Users want a dashboard that feels finished and dependable without giving up privacy or control of their setup.

## Competitive Landscape

**Direct:** Other self-hosted smart-home dashboard frontends — compete on visual quality, ease of setup, provider coverage, and screen adaptability.

**Secondary:** Default Home Assistant, Homey, and openHAB interfaces — already available to users, but often serve administration and platform-specific workflows alongside daily control.

**Indirect:** Fully custom dashboards and wall-panel configurations — offer flexibility, but can demand more setup and maintenance.

## Differentiation

**Key differentiators:**

- Room-first daily control instead of an admin-first information hierarchy.
- One responsive interface for wall panels, tablets, desktops, and phones.
- Local-first, self-hosted operation with provider credentials kept on the user's device or server.
- Three implemented provider runtimes with selected-provider aggregation in supported standalone flows.
- A mature Home Assistant experience spanning panel, add-on, and standalone modes.
- Open-source code and a documented provider-neutral package direction.

**How Navet does it differently:** Shared dashboard UI consumes normalized Navet entities and capabilities while provider packages own authentication, transport, state mapping, and command translation.

**Why that is better:** Users get a consistent surface without pretending every provider offers the same advanced services.

**Intended reason to choose Navet:** Navet is designed for people who want a polished, local-first dashboard that works on the screens already in their home and does not lock the experience to a single provider architecture. Treat this as a positioning hypothesis until customer research verifies the language.

## Objections

| Objection | Response |
|---|---|
| Is every feature available on every provider? | No. Home Assistant is the most mature integration. Homey and openHAB currently cover rooms, realtime entities, lighting, switches, and sensors. The public capability matrix documents the difference. |
| Will this replace my provider? | No. Navet is the daily control surface; the connected provider remains the source of truth for devices and services. |
| Does Navet send my smart-home data to its own cloud? | Navet is local-first and self-hosted. Provider data, dashboard state, and credentials remain on the user's device or server rather than Navet servers. |

**Anti-persona:** Users who want a fully managed cloud service, require identical advanced features across every provider today, or do not want to operate a self-hosted application.

## Switching Dynamics Hypotheses

These are strategy hypotheses to validate in future customer research, not repository-verified customer statements.

**Push:** Admin-heavy daily workflows, inconsistent dashboards across screens, and recurring maintenance for custom panels.

**Pull:** A finished room-first interface, local ownership, responsive layouts, and support for the platform already running the home.

**Habit:** The provider's default UI is already installed and familiar.

**Anxiety:** Installation effort, provider feature gaps, migration risk, and whether household members will find a new interface easier.

## Customer Language

**How they describe the problem:** No verified verbatim customer research is stored in the repository yet.

**How they describe Navet:** No verified testimonials are stored in the repository yet.

**Words to use:** smart home, room-first, local-first, self-hosted, everyday control, wall panel, tablet, phone, open source, supported provider, capability.

**Words to avoid:** revolutionary, seamless, universal, cloud-powered, Home Assistant dashboard, equal provider support, supports everything.

**Glossary:**

| Term | Meaning |
|---|---|
| Provider | A connected smart-home platform such as Home Assistant, Homey, or openHAB. |
| Room-first | Navigation and control organized around the places people recognize in their home. |
| Local-first | Smart-home data and credentials stay on the user's own device or server instead of Navet-operated servers. |
| Capability | A feature service an implemented provider can supply to the shared dashboard. |
| Multi-provider | A supported runtime retaining more than one provider session and combining selected providers in shared dashboard collections. |

## Brand Voice

The canonical execution guide is [`docs/branding/VOICE_AND_MESSAGING.md`](../docs/branding/VOICE_AND_MESSAGING.md),
with the complete identity system in [`docs/branding/README.md`](../docs/branding/README.md).

**Tone:** Calm, confident, friendly, and honest.

**Style:** Clear, concise, user-focused, and specific. Lead with what people can accomplish, then explain technical detail when it helps them choose or contribute.

**Personality:** Calm, deliberate, warm, clear, open, and practical.

## Proof Points

**Product inventory:** Provider, section, card, widget, language, and theme counts are release-dependent facts, not standing brand metrics. Verify them against the current implementation, integration matrix, and user documentation before external use, and record the source and date.

**Customers:** No customer or organization logos are documented.

**Testimonials:** No verified testimonials are documented.

**Value themes:**

| Theme | Proof |
|---|---|
| Works across screens | Responsive dashboard and PWA support for wall panels, tablets, desktops, and phones. |
| Local by default | Provider data, dashboard state, and credentials remain on the user's device or server. |
| Provider choice | Implemented Home Assistant, Homey, and openHAB runtimes with a published capability matrix. |
| Mature Home Assistant path | Custom panel, add-on, and standalone deployment guides. |
| Open and extensible | AGPL-3.0-only codebase with provider, core, UI, app, Storybook, demo, website, and docs workspaces. |

## Goals

**Business goal:** Grow adoption and contribution around a trustworthy, provider-neutral smart-home dashboard.

**Conversion action:** Explore the live demo, then choose an installation guide.

**Current metrics:** Not documented in the repository.
