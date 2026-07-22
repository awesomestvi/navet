---
title: Voice and messaging
description: How Navet speaks across product, documentation, marketing, and community work.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/branding/VOICE_AND_MESSAGING.md
---

Navet speaks like the product works: calm, direct, compact, and grounded in the current state of the
home. It helps a person understand what is happening, choose an action, and recover when something
goes wrong.

This guide applies to product UI, the demo, website, documentation, setup, errors, release notes,
community communication, and technical material.

## Message Hierarchy

Use the smallest level that gives the audience enough context.

### 1. Product name

**Navet**

Do not attach a changing slogan to the name in every placement.

### 2. Established public descriptor

> A smart home dashboard for every screen.

This is the default headline-level descriptor. Preserve the wording when it is used as a
standalone line. Editorial sentences keep the period; display headlines may omit it, as the
established website hero does. It is not a capability claim that every feature works on every
device or provider.

### 3. Short product description

> Navet is a polished, local-first smart-home dashboard for supported platforms, built for wall
> panels, tablets, desktops, and phones.

When provider names help the reader decide, replace **supported platforms** with the current,
verified provider list. Do not hard-code the list into evergreen brand templates.

### 4. Standard product explanation

> Navet turns the smart-home platform you already use into a calmer, room-first interface for
> everyday control. It keeps live state and common actions close at hand across household screens
> while the connected provider remains the source of truth.

Add local-first, open-source, installation, or capability detail only when it answers the next
question in the reader's journey.

### 5. Contextual proof

Use real product evidence:

- a current dashboard or card interaction
- a named supported provider and its documented capability
- a current installation path
- a precise description of local data handling
- the live demo, docs, repository, changelog, or roadmap

Do not jump from a broad promise to an unverified number, testimonial, comparison, or roadmap item.

### 6. Next action

The usual public path is:

1. **Explore the demo** when someone wants to understand the product.
2. **Choose an installation** when they are ready to use it.
3. **Read the docs** when they need detail or recovery help.
4. **Contribute** when they want to improve the project.

Use the action that matches the moment. Do not present every destination as an equally loud call to
action.

## Message Pillars

### Everyday control without admin-screen clutter

Lead with rooms, live state, and common household actions. Explain architecture only after the user
outcome is clear.

**Use:**

> See lights, climate, media, energy, and security by room.

**Avoid:**

> Centralize every entity in a unified management layer.

### Familiar from wall panels to phones

Describe a consistent interaction model that adapts to different screens. Do not imply pixel-level
sameness or guaranteed support for every browser and device.

**Use:**

> Wall panels, tablets, desktops, and phones stay familiar.

**Avoid:**

> One identical experience on every device.

### Local ownership

Name what remains local and where. Do not use privacy as an atmosphere without explaining the
boundary.

**Use:**

> Provider data, dashboard state, and credentials stay on your device or server, not on Navet
> servers.

**Avoid:**

> Navet never sends any data anywhere.

### Provider choice with honest depth

Name the provider, mode, and relevant capability when the distinction matters. Never turn
provider-neutral architecture into a promise of equal support.

**Use:**

> Home Assistant is Navet's most mature integration. Check the capability matrix before choosing a
> setup for advanced features.

**Avoid:**

> Every provider supports the complete Navet experience.

### Open and inspectable

Connect open source to user control and participation. Do not let maintainer process replace the
product story.

**Use:**

> Run it yourself, inspect the code, and help shape what comes next.

**Avoid:**

> Built on a provider-neutral monorepo with an evolving package extraction.

The second sentence can be useful in architecture documentation, but not as the public value
proposition.

## Voice Principles

### Calm

Use a steady, measured tone. Avoid hype, alarm, and false urgency. A serious state can be direct
without becoming dramatic.

- Prefer: **Camera unavailable**
- Avoid: **Critical camera failure!**

### Clear

Put the outcome, state, or required action first. Use technical detail only when it helps someone
decide, complete a task, or diagnose a problem.

- Prefer: **Could not connect to Home Assistant. Check the address and try again.**
- Avoid: **Provider initialization encountered an exception.**

### Concise

Product UI uses only the words needed to understand or act. Marketing and docs can breathe, but
each sentence still earns its place.

- Prefer: **Nothing playing**
- Avoid: **There is currently no media content being played on any available device.**

### Friendly

Write for a capable person, not an operator reading a machine console. Use familiar words and
natural contractions where they improve flow. Do not become cute, chatty, or patronizing.

- Prefer: **Choose the room you want to control.**
- Avoid: **Let's get your magical smart-home journey started!**

### Honest

State limits, requirements, and changing support without hedging or hiding the useful part. Never
trade accuracy for a smoother headline.

- Prefer: **This feature is not available for this provider.**
- Avoid: **Coming soon** unless it is genuinely committed and documented.

### Grounded

Use rooms, devices, live values, household actions, and real Navet screens. Avoid generic futurism,
abstract transformation language, and unsupported emotional claims.

- Prefer: **Turn off the kitchen lights.**
- Avoid: **Transform the way you live.**

## Tone by Context

The voice stays constant; emphasis changes with the situation.

| Context | Emphasis | Pattern | Example |
|---|---|---|---|
| Marketing | Confident, warm, outcome-led | User outcome → product proof → one next action | **See your home at a glance. Explore the demo.** |
| Product card | Compact, state-led, tactile | Identity → live state → primary action → secondary detail | **Kitchen island · On · 72%** |
| Navigation and controls | Familiar, verb-led | Short action or destination | **Open camera**, **Choose room**, **Turn off** |
| Documentation | Patient, sequential, exact | Goal → prerequisite → steps → expected result → recovery | **Start the add-on, then choose Open Web UI. Navet should open in a new tab.** |
| Setup and onboarding | Reassuring, explicit, progress-aware | What is needed → what is happening → next action | **Enter your Navet address to continue.** |
| Loading or connection | Informative, non-committal | Present action; add cancel or recovery when waiting can continue | **Connecting to Home Assistant…** |
| Empty state | Neutral, useful | What is absent → relevant next action | **No rooms yet. Add a room in your provider, then return here.** |
| Success | Quiet, specific | Completed outcome → next useful step, if any | **Home Assistant connected.** |
| Warning | Direct, proportionate | Risk → consequence → safer action | **This address uses HTTP. Use a trusted local network or switch to HTTPS.** |
| Error | Plain, agency-preserving | What failed → likely check → retry, cancel, or alternate route | **Could not load the dashboard. Try again or return to settings.** |
| Security and privacy | Precise, bounded, factual | Data or credential → location → exception or user responsibility | **Provider credentials stay on your device or server; public deployments still need HTTPS and access controls.** |
| Changelog | Concrete, user-facing, scannable | Outcome or fixed behavior → scope where needed | **Media keeps playing when you move between dashboard sections.** |
| Community and support | Respectful, collaborative | Acknowledge → evidence needed → next step | **Please include your Navet version and installation method.** |
| Architecture | Technical, exact, provider-neutral | Current owner → contract or seam → limitation or target | **Shared UI consumes normalized Navet entities rather than provider payloads.** |

Examples illustrate the pattern; verify product-specific facts and terminology before publishing
them.

## The Product Speaks Through Cards

The demo cards are not silent visual containers. Their copy, state hierarchy, controls, semantic
color, and response to touch establish Navet's operational voice.

Follow this order:

1. **Identity:** the room, device, person, scene, or household concept.
2. **Live state:** the value or condition a person needs now.
3. **Exception:** unavailable, open, unlocked, offline, or another state that changes attention.
4. **Primary action:** the most likely direct household action.
5. **Secondary detail:** only what helps interpret state or choose the next action.

Prefer real household language:

| Prefer | Avoid |
|---|---|
| Kitchen island | `light.kitchen_island` |
| No alerts | 0 security entities active |
| Nothing playing | Playback state: idle |
| Front door unlocked | Lock entity is false |
| 21° | Current temperature value is 21 degrees |
| Turn off | Execute off service |

Do not add descriptions, badges, statuses, or calls to action simply to fill a card. A concise
surface with clear state is more recognizably Navet than a complete sentence in every empty space.
See the [product card grammar](https://docs.navet.app/brand/cards/) for the full product-card system.

## Grammar and Mechanics

### Capitalization

- Write **Navet**, **Home Assistant**, **Homey**, and **openHAB** exactly.
- Use sentence case for headings, buttons, labels, statuses, and navigation.
- Reserve uppercase for established eyebrow labels, external identifiers, and short technical
  codes. Do not use it as the default way to create hierarchy.
- Use lowercase names only where the official technical form requires it: `navet.app`, package
  names, commands, paths, and identifiers.

### Smart-home language

- Use **smart home** as a noun: **a dashboard for your smart home**.
- Use **smart-home** as a compound adjective when it improves clarity: **smart-home dashboard**.
- Use **room-first**, **local-first**, **self-hosted**, and **open-source** as compound adjectives.
- Use **open source** as a noun: **Navet is open source**.

### Sentences and punctuation

- Prefer active voice and short sentences.
- Use contractions when they sound natural: **couldn't**, **you'll**, **doesn't**.
- Use periods for complete explanatory sentences. Compact labels and buttons do not need them.
- Avoid exclamation marks in normal product and documentation copy.
- Use an ellipsis only for an action in progress: **Connecting…** Do not use three periods.
- Use em dashes sparingly. Do not build every marketing sentence around one.
- Use **and** in prose; reserve **&** for an official name or constrained label.

### People and agency

- Prefer **you** when giving a direct instruction and **people** or **household** when describing
  shared use.
- Do not call people **users** in public copy when a more natural word works.
- Do not imply the household belongs to Navet. Say **your home**, **your server**, and **your
  provider**.
- Do not blame the person. Describe the state and the next safe action.

### Numbers and technical detail

- Use numerals for live values, versions, counts, time, and measurements.
- Include units and scope where ambiguity matters.
- Do not publish exact counts of integrations, sections, cards, widgets, languages, themes, or
  screens as evergreen copy. Counts require current verification and a reason to help the reader.
- Keep entity IDs, logs, paths, ports, and package names in technical contexts or code formatting.

## Terminology

| Term | Use | Avoid or qualify |
|---|---|---|
| Navet | The product and master brand | Lowercase in prose; possessive-heavy constructions |
| smart-home dashboard | The product category | **Home Assistant dashboard** as the overall category |
| provider | A connected smart-home platform in technical or capability contexts | Using it when **platform** is clearer to a new reader |
| platform | Home Assistant, Homey, openHAB, or another system a person already uses | Claiming every platform is supported |
| integration | The connection and capability implementation for a provider | Treating an integration as a separate Navet edition |
| room-first | Organized around places people recognize in their home | Implying rooms are the only possible organization |
| local-first | Smart-home data and credentials stay on the person's device or server rather than Navet-operated servers | **Offline-only**, **no network**, or **no tracking** without a precise scope |
| self-hosted | Operated on infrastructure controlled by the person or household | **Private by default** without deployment caveats |
| capability | A feature a provider can supply to the shared dashboard | **Full support** without naming the relevant scope |
| supported | Implemented and documented for the named mode and capability | **Available** based only on a planned package or roadmap entry |
| planned | Publicly documented intent that is not available today | **Coming soon** without a committed delivery plan |
| multi-provider | A supported runtime retaining multiple provider sessions and combining selected providers in shared collections | **Universal**, **all-in-one**, or automatic parity |
| dashboard | The daily Navet control surface | **Admin console**, unless referring to an actual administration surface |
| wall panel | A shared, often fixed household display | Assuming every wall panel has the same input or performance profile |
| Navet Dev | The established development release line | **Beta**, **preview**, or **nightly** unless that is the official status |

## Words and Phrases

### Prefer

- smart home
- room-first
- everyday control
- at a glance
- local-first
- self-hosted
- supported provider or supported platform
- wall panel, tablet, desktop, and phone
- open source
- choose, connect, open, check, control, try again, return

### Avoid

- revolutionary
- magical
- seamless
- effortless
- ultimate
- perfect
- best-in-class
- universal
- all-in-one
- supports everything
- complete provider parity
- cloud-powered
- privacy-first without a concrete boundary
- beautiful as a substitute for a product outcome
- premium as a visual instruction

Do not use **the hub for your smart home**, **everything in one place**, **beautiful, private, and
open source**, or **your home, your way** as rotating taglines. Those older phrases can describe
parts of the established idea, but the default public descriptor is **A smart home dashboard for
every screen.** The Swedish hub meaning belongs in the origin story, not every campaign.

## Claims Discipline

A Navet claim must be accurate, current, scoped, and supported by a primary source. Smooth wording
does not compensate for weak evidence.

### Durable brand claims

These can be used without a release count, provided the implementation still supports them:

- Navet is a self-hosted smart-home dashboard.
- Navet is room-first and designed for wall panels, tablets, desktops, and phones.
- Navet is local-first and open source.
- Navet connects to supported smart-home platforms while those platforms remain the source of
  truth.

Even durable claims need review if product architecture or data flow materially changes.

### Product and provider claims

Before publication, verify:

- the provider is implemented, not merely registered or planned
- the named capability is available for that provider and deployment mode
- the installation path still exists
- the screenshot or demo state reflects the current product
- any limitation that would change a reader's decision appears near the claim

Use the [capability matrix](https://docs.navet.app/integrations/), current implementation, and release documentation.
Do not infer capability parity from shared UI or provider-neutral architecture.

### Privacy and security claims

Separate the self-hosted product from public Navet web properties.

Approved product-data framing:

> Navet does not require a Navet cloud account. Provider data, dashboard state, and credentials stay
> on your device or server rather than Navet servers.

Avoid broad claims such as **no tracking**, **zero data collection**, **completely private**, or
**never sends data anywhere** unless a current audit proves that exact scope. The public website,
docs, and demo may use web analytics independently of the self-hosted product. Publicly
exposed installations also depend on the operator's HTTPS, access, provider, and network choices.

Security language should name the asset, location, risk, and action. It must not promise absolute
safety.

### Quantitative claims

Counts, percentages, performance results, stars, downloads, contributor numbers, compatibility
counts, and business outcomes require:

- a named primary source
- the date collected
- the measured scope and method
- a refresh or expiry expectation

A live GitHub star count is a community signal, not a customer metric. Repository counts of card
families or providers are product inventory, not proof that people achieved an outcome.

### Customer proof

Do not invent a customer quote, name, logo, case study, pain point, or outcome. Before publishing
customer proof, record:

- the original verbatim source
- permission and approved attribution
- the relevant product version and use case
- any editing or translation

Paraphrases must not be presented in quotation marks.

### Comparative and superlative claims

Avoid **best**, **fastest**, **most private**, **easiest**, **only**, and named competitive claims
without current, reproducible evidence and a clearly defined comparison set. Describe Navet's own
approach instead of diminishing another project.

### Roadmap claims

Use **planned**, **exploring**, or **on the roadmap** only when the current public roadmap supports
the wording. Never write a planned provider or placeholder package as supported. Avoid dates unless
the maintainers have made a public commitment.

### Claim review checklist

Before publishing, ask:

1. What exactly is being claimed?
2. Is it a durable identity statement or a changing product fact?
3. Which primary source proves it today?
4. Does the scope name the provider, deployment mode, version, surface, or date when needed?
5. Is a nearby limitation necessary for a person to make the right decision?
6. Could the wording be mistaken for provider parity, endorsement, absolute privacy, or a delivery
   commitment?
7. Is the proof available to a reviewer rather than remembered from an earlier release?

If the answer is uncertain, narrow the claim or verify it before publishing.

## Channel Patterns

### Website and repository front page

Lead with the established descriptor and a user outcome. Show the real product. Point first to the
demo, then installation. Keep architecture and inventories below the product story.

### Documentation

Name the goal, prerequisite, steps, expected result, and recovery path. Use exact UI labels. Keep
acquisition copy out of pages shown only after installation.

### Product UI

Use the existing translation system. Keep labels short, sentence case, and useful without hover.
State comes before explanation. Configuration belongs behind progressive disclosure rather than in
every card.

### Release notes

Write what changed for the person using Navet. Prefer short, scannable outcomes over commit or
implementation narration.

- Prefer: **Cameras now return to the dashboard without losing their selected view.**
- Avoid: **Refactored camera navigation state persistence.**

### Support and incidents

Lead with the observed surface and current impact. Distinguish confirmed facts from hypotheses.
Give a safe next action and say when an update will follow only if that commitment can be kept.

### Social and community

Use one idea, one concrete proof point, and one next action. Avoid engagement bait, manufactured
urgency, and a corporate voice that does not match the open project.

## Copy Review

Before shipping copy, check that it:

- sounds like the demo cards: stateful, useful, and concise
- leads with the person or household outcome before implementation detail
- uses the established descriptor rather than inventing another tagline
- preserves exact names and sentence case
- has one clear primary action
- removes filler, hype, and generic technology language
- distinguishes current support from planned work
- scopes local-first, security, and provider claims precisely
- uses current product proof instead of unverified customer or quantitative proof
- provides recovery or cancellation when a process may leave someone waiting
- remains understandable when translated or read on a narrow screen

If the copy could describe any polished technology product after replacing the name, make it more
specific to rooms, household state, direct control, self-hosting, or the real Navet interface.
