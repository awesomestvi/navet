---
title: Navet brand system
description: Apply Navet's established identity consistently without redesigning it.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/branding/README.md
---

Navet already has an identity. This system documents it so that product UI, documentation,
marketing, releases, community material, and official assets continue to feel like the same
product as Navet grows.

Use these documents to preserve and apply the established brand. They are not a brief for a
rebrand.

## Start Here

- [Brand foundations](https://docs.navet.app/brand/foundations/) defines Navet's durable purpose, promise,
  positioning, principles, audiences, and brand architecture.
- [Voice and messaging](https://docs.navet.app/brand/voice/) defines the message hierarchy, voice, tone by
  context, terminology, examples, and claims discipline.
- [Visual identity](https://docs.navet.app/brand/visual/) defines how the established logo, color, type,
  composition, imagery, motion, and accessibility system are expressed.
- [Product card grammar](https://docs.navet.app/brand/cards/) defines how Navet's product cards communicate identity,
  live state, actions, semantic color, and responsive behavior.
- [Brand asset system](https://docs.navet.app/brand/assets/) defines source and distribution ownership for official brand
  assets. The working asset index lives in [assets/brand/README.md](https://github.com/awesomestvi/navet/blob/main/assets/brand/README.md),
  with reusable layouts in [assets/brand/templates/](https://github.com/awesomestvi/navet/tree/main/assets/brand/templates/).
- [Brand governance](https://docs.navet.app/brand/governance/) defines ownership, change classes, review gates, maintenance, and
  deprecation.
- [Brand and trademark policy](https://docs.navet.app/brand/trademark/) defines permitted use of the Navet name and marks.

[The legacy brand reference](https://github.com/awesomestvi/navet/blob/main/docs/branding/BRANDING.md) and [asset quick reference](https://github.com/awesomestvi/navet/blob/main/docs/branding/BRANDING_ASSETS.md) remain useful quick
references for the name, logo, and existing files. When a quick reference and a specialized
document differ, use the specialized document for that concern.

## Preservation Charter

The following parts of Navet are established and must be preserved unless the maintainers
explicitly commission a rebrand:

- the **Navet** name, capitalization, Swedish origin, and established pronunciation
- the existing hub mark, wordmark, geometry, proportions, and orange gradient
- orange as the identifying brand accent, supported by neutral canvases and restrained warm and
  cool atmosphere
- system UI typography and the current theme families: `glass`, `dark`, `light`, and `black`
- the room-first, local-first, self-hosted, open-source product character
- calm, direct, concise language focused on what a person can understand or do
- product cards as an essential expression of the brand, with live state, semantic color, tactile
  controls, and household language
- the visual and behavioral continuity already present across
  [navet.app](https://navet.app/), [docs.navet.app](https://docs.navet.app/), and
  [demo.navet.app](https://demo.navet.app/)

Do not add a new logo, tagline, typeface, palette, radius system, shadow language, personality, or
positioning simply to make the system feel more complete. Completeness comes from documenting and
operating the identity Navet already has.

## One Brand, Three Reference Surfaces

The website, docs, and product are co-equal evidence of Navet's identity. Each expresses the same
brand for a different job:

| Surface | What it contributes | What not to infer |
|---|---|---|
| [navet.app](https://navet.app/) | Public promise, product framing, atmospheric composition, and the path to demo or installation | Marketing composition is not a dashboard layout recipe |
| [docs.navet.app](https://docs.navet.app/) | Clear explanation, quiet navigation, helpful sequencing, and restrained product storytelling | Documentation structure is not permission to make the product feel like a content site |
| [demo.navet.app](https://demo.navet.app/) | The operational voice of Navet: real state, semantic color, touchable controls, compact hierarchy, and room-level language | Card colors are semantic, not a palette to apply decoratively to every public surface |

When the surfaces differ, preserve the job of each surface and look for the common principle:
clear hierarchy, restrained expression, real product state, familiar geometry, and a direct next
action.

## Brand Layers

Keep three kinds of information separate. This prevents release facts from becoming permanent
brand claims.

### 1. Durable identity

Changes rarely and only through explicit brand review:

- name and marks
- purpose, promise, positioning, and principles
- personality and voice
- visual foundations
- card communication principles

The specialized documents in this directory own this layer.

### 2. Expression

Evolves while remaining recognizably Navet:

- page layouts and campaigns
- screenshots, photography, illustrations, and release graphics
- documentation patterns
- product compositions built from established primitives
- examples of copy and motion

Expression must follow the durable layer and the design system. A new expression does not create
a new brand rule by itself.

### 3. Product truth

Can change with every release:

- supported providers and capability depth
- installation paths and deployment requirements
- counts of cards, widgets, sections, themes, languages, or integrations
- roadmap status, version numbers, performance results, and adoption metrics
- screenshots of current functionality

Verify these facts in current product and release sources before publishing them. Never copy a
dated number or provider claim into a durable brand rule.

## Source Map

Use the source that owns the question instead of choosing whichever wording is easiest to find.

| Question | Canonical source | Supporting evidence |
|---|---|---|
| What does Navet stand for? | [Brand foundations](https://docs.navet.app/brand/foundations/) | [Product marketing context](https://github.com/awesomestvi/navet/blob/main/.agents/product-marketing.md) |
| How should Navet sound? | [Voice and messaging](https://docs.navet.app/brand/voice/) | Current product, website, and docs copy |
| How should Navet look? | [Visual identity](https://docs.navet.app/brand/visual/) | [UI guidelines](https://github.com/awesomestvi/navet/blob/main/docs/design-system/UI-GUIDELINES.md) and current public surfaces |
| How should a card communicate? | [Product card grammar](https://docs.navet.app/brand/cards/) | [demo.navet.app](https://demo.navet.app/), current app cards, and Storybook |
| Which asset should be used? | [Brand asset system](https://docs.navet.app/brand/assets/) | [Asset source reference](https://github.com/awesomestvi/navet/blob/main/assets/brand/README.md) and `assets/public/` distributions |
| Which recurring layout should be used? | [Brand templates](https://github.com/awesomestvi/navet/tree/main/assets/brand/templates/) | [Visual identity](https://docs.navet.app/brand/visual/) and current product captures |
| May the name or logo be used? | [Brand and trademark policy](https://docs.navet.app/brand/trademark/) | [Brand quick reference](https://github.com/awesomestvi/navet/blob/main/docs/branding/BRANDING.md) |
| What can the product do today? | [Integration capability matrix](https://docs.navet.app/integrations/) and current implementation | [Repository overview](https://github.com/awesomestvi/navet#readme), user guide, installation guides, and release notes |
| What is planned? | [Public roadmap](https://docs.navet.app/roadmap/) | Current project and issue status |
| How should shared UI be implemented? | [UI guidelines](https://github.com/awesomestvi/navet/blob/main/docs/design-system/UI-GUIDELINES.md) | [AI design context](https://github.com/awesomestvi/navet/blob/main/docs/design-system/AI-DESIGN-CONTEXT.md), Storybook, and product neighbors |
| What may marketing claim? | [Claims discipline](https://docs.navet.app/brand/voice/#claims-discipline) | Current product truth and a dated primary source |

`.agents/product-marketing.md` is a working context document for marketing tasks. It may summarize
current product facts and known evidence gaps, but it does not replace this brand system or the
capability matrix.

## Decision Rules

Before publishing or implementing a brand expression:

1. Identify whether the decision concerns durable identity, expression, or product truth.
2. Read the canonical source for that concern.
3. Name the current Navet surface being used as the expression reference.
4. Verify every capability, privacy, security, comparison, and numeric claim against a current
   primary source.
5. Check that the result still communicates like the product: identity, live state or user
   outcome, primary action, then supporting detail.
6. Review the result in its real context, including light and dark backgrounds, narrow screens,
   reduced motion, and realistic content where relevant.

If evidence conflicts, do not average the sources. Resolve the conflict in the owning document or
product source, then update dependent material.

## Governance

Use [brand governance](https://docs.navet.app/brand/governance/) for the complete approval matrix, review checklist,
maintenance cadence, and deprecation process.

### Self-service changes

These normally do not require a new brand decision:

- using an approved asset in an approved context
- writing within the message hierarchy and tone matrix
- updating a verified product fact while preserving its caveat and date
- replacing an outdated screenshot with an accurate current screenshot
- composing a new page or card from established patterns

### Brand review required

Ask the maintainers responsible for brand and product design before:

- altering the name, mark, wordmark, gradient, clear space, or proportions
- introducing a new tagline, descriptor, font, palette, icon style, illustration style, or motion
  language
- changing the core positioning, personality, audience priority, or message hierarchy
- creating a sub-brand, certification mark, partnership lockup, merchandise range, or app-store
  identity
- treating a one-off campaign or component as a new system-wide rule

### Product, security, or legal review required

- Product owners review provider support, feature, roadmap, and compatibility claims.
- Security maintainers review privacy, credential, data-flow, and public-deployment claims.
- Trademark owners review co-branding, forks, redistribution, sponsorship, and use of the Marks.
- Quantitative or customer claims require a named source, collection date, permission where
  applicable, and a clear scope.

## Maintenance

- Review product-fact links and standard descriptions before a major release or campaign.
- Review logo distributions, manifests, metadata images, and asset dimensions when an official
  asset changes.
- Update the owning document first; then update summaries and templates that depend on it.
- Keep examples illustrative. Do not silently promote one example into a permanent rule.
- Record intentional brand-system changes in the pull request and name the reference surfaces used
  to evaluate them.

The standard for consistency is not visual sameness. It is that every official Navet surface feels
calm, direct, useful, and grounded in the real product.
