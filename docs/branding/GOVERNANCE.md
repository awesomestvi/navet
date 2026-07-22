---
title: Brand governance
description: How Navet's established identity is owned, reviewed, changed, and kept consistent.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/branding/GOVERNANCE.md
---

Brand governance keeps Navet recognizable as the product evolves. It protects established choices,
makes routine work easy, and gives genuine changes an explicit review path.

This is not a committee process. The repository maintainers own the brand system and use these
rules to make decisions consistently.

## Sources of truth

Use the most specific source for the decision:

| Question | Authority |
| --- | --- |
| What Navet stands for | [Brand foundations](https://docs.navet.app/brand/foundations/) |
| What Navet says | [Voice and messaging](https://docs.navet.app/brand/voice/) |
| How Navet looks | [Visual identity](https://docs.navet.app/brand/visual/) |
| How product cards speak | [Product card grammar](https://docs.navet.app/brand/cards/), UI guidelines, shared tokens, and Storybook |
| Which asset to use | [Brand asset system](https://docs.navet.app/brand/assets/) and `asset-manifest.json` |
| Whether a name or mark may be used | [Brand and trademark policy](https://docs.navet.app/brand/trademark/) |
| Current product capability | Product source, integration matrix, release documentation, and current deployed surfaces |

When sources disagree, do not average them. Verify the current product and fix the less
authoritative or stale source in the same change.

## Reference surfaces

Navet has three co-equal public references, each answering a different question:

- [demo.navet.app](https://demo.navet.app/) and the Home cards define operational product
  expression: state hierarchy, semantic color, card geometry, controls, and compact household
  language.
- [navet.app](https://navet.app/) defines expressive product storytelling: composition, product
  imagery, atmosphere, and public messaging.
- [docs.navet.app](https://docs.navet.app/) defines editorial expression: structure, readability,
  technical clarity, and restrained brand presence.

Do not make one surface imitate another. A documentation table does not need to become a product
card, and a product card should not become a marketing panel.

## Change classes

### Routine application

Examples include exporting an approved logo size, using an existing message, creating a release
card from an approved template, or applying known card rules to a new domain.

Routine applications may proceed when they:

- use an approved source and variant
- preserve established hierarchy, geometry, colors, type, and language
- pass the relevant asset, accessibility, and product checks
- are reviewed on the actual destination surface

### System extension

Examples include a new template, platform export, semantic state, card family, illustration mode,
or recurring communication format.

An extension needs maintainer review and must document:

- the real use case that existing rules do not cover
- the nearest Navet reference and what is being inherited
- how it behaves across light and dark contexts, responsive sizes, and reduced motion where
  relevant
- its source, output, owner, and validation path
- why it is an extension of Navet rather than a parallel visual language

### Identity change

Changes to the name, hub mark, wordmark relationship, orange gradient, primary typography
direction, established descriptor, core personality, or product card signature are identity
changes. They require an explicit rebrand decision from the maintainers. Do not introduce them as
cleanup, experimentation, or a one-off campaign.

## Approval matrix

| Change | Required evidence | Required review |
| --- | --- | --- |
| Copy using an approved pattern | Current product facts and voice check | Normal content review |
| Generated logo or icon size | Manifest target, dimension check, visual check | Normal code review |
| New recurring template | Real use case, reference surface, contrast/export proof | Maintainer brand review |
| New card family | Neighboring product surface, shared primitive/story, state and interaction proof | Product UI review |
| New provider or partner lockup | Current relationship, trademark terms, neutral co-branding layout | Maintainer and legal/trademark review |
| Core identity change | Explicit rebrand brief and cross-surface migration plan | Explicit maintainer approval |

Silence is not approval for an identity change.

## Review checklist

Before merging brand-facing work, confirm:

### Intent

- Is the audience and use case named?
- Does the work preserve Navet rather than reinterpret it?
- Is the nearest reference surface identified?

### Product and copy

- Does the hierarchy lead with identity, live state, exception, action, then detail where that
  order applies?
- Is the language direct, compact, and useful?
- Are provider, privacy, security, performance, roadmap, and comparative claims supported by
  current evidence?
- Are temporary product facts kept out of evergreen templates?

### Visual expression

- Is orange being used for Navet identity, selection, or an intentional brand moment rather than
  as a universal state color?
- Do semantic, device, content, and user-selected colors retain their product meaning?
- Does the work use established typography, geometry, imagery, and motion?
- Is it legible and operable with keyboard, touch, high zoom, and reduced motion as appropriate?

### Assets and delivery

- Does the file come from an approved source in the asset manifest?
- Are dimensions, format, color space, clear space, and destination requirements correct?
- Were source and generated outputs changed together?
- Was the result reviewed in its final context, not only in an editor?

## Maintenance cadence

The brand system is durable, but its evidence is not. Review it when:

- a release changes providers, capabilities, install paths, screenshots, or public proof
- a new app, platform, distribution, or recurring communication format is added
- product tokens or shared card primitives change
- a deployed public surface drifts from the documented system
- a platform changes icon, manifest, accessibility, or asset requirements

At least once per major release line, check public descriptors, provider references, screenshots,
asset dimensions, generated mirrors, and links. Do not rewrite the foundations merely to make a
review look active.

## Deprecating an asset or pattern

1. Mark the old source as deprecated and name its replacement.
2. Search all product, website, docs, templates, release, and platform distributions.
3. Migrate consumers before deleting the old file.
4. Keep a compatibility alias only when a real consumer requires it.
5. Remove the alias and update the manifest once that consumer is gone.

Never silently replace an existing asset path with materially different artwork.

## Contribution handoff

A complete brand contribution includes:

- the documented decision or rule
- editable source where appropriate
- generated exports where required
- a reusable template or example when the pattern will recur
- machine-readable manifest or token changes when applicable
- targeted validation results
- a note identifying any intentionally unresolved evidence gap

The goal is a system another contributor can apply without guessing what Navet is supposed to
look or sound like.
