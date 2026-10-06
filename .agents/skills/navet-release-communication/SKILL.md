---
name: navet-release-communication
description: Prepare and publish one approved Navet community post to Reddit, Discord and the existing Home Assistant topic. Use for release updates, feature promotion, tips, project discussion and general Navet posts.
---

# Navet community posts

Deliver checked drafts when asked to draft and verified public links when asked to post. Run on
request. Use one master title, body, CTA, screenshot and alt text for all three default destinations:
r/navet, Navet Discord #announcements and the configured existing Home Assistant topic. Respect a
requested subset. Destinations are in `scripts/config/marketing-channels.yml`.

Show one review package with the master post, actual screenshot, alt text, identities and the
three destinations. One human approval authorizes that same post in all three places. Never ask
for separate platform approvals or create three editorial variants. Reddit uses its title field;
Discord and forum replies prepend the title and a blank line. Native paragraphs, Markdown lists,
link rendering and upload syntax may differ while preserving wording, URLs, image and alt text.
Changed substantive content or assets need renewed approval. A human request to reuse an already
reviewed post at another named destination authorizes that destination. Other communities and
new brand templates require explicit scope.

## Establish the post

Read `AGENTS.md`, `ai/skills/marketing-workspace.md`, `docs/branding/VOICE_AND_MESSAGING.md`
and relevant asset guidance from `docs/branding/README.md`. Reuse Navet's language and design
standards. Create one task under `marketing/wip/community/<task-id>/`; retain progress, the human
request, selected angle, source head, destinations, evidence, approvals and blocked steps.
Check existing task/channel publications before drafting. Keep secrets outside task files.

Support `release`, `feature`, `how-to`, `tip`, `behind-the-scenes` and `general` posts. For feature
promotion, verify availability in the current public product and capture matching public-safe
demo proof. For general discussion, use the maintainer's actual point of view or factual product
context; never invent opinions, adoption, metrics or roadmap commitments. Use a clean source
checkout at the exact verified commit. Clearly identify a requested preview or planned feature.
Never describe planned functionality as shipped or imply full provider parity.

For releases, resolve the latest published stable release from GitHub unless another version was
requested. Retain its URL, tag, exact source commit and complete published changelog. Read every
entry and verify claims against tagged fragments and product source. Ask **“What should be the
headline news for this release?”** after a short digest, unless the maintainer already supplied
it. Wait for the answer before final copy and asset selection; continue independent checks.
Retain `headlineNews: { text, requestReference }` and `changelog: { path, url }`. Use the selected
news to drive the title, opening and screenshot; summarize other changes in at most three compact
points and link the complete changelog. Release proof must come from that tag.

For other posts, use the requested feature/topic as the angle. Ask which message should lead
only when the request leaves the angle materially unclear. A changelog is required only for a
release recap or a claim about a particular release.

## Produce one master and review

Use [publication inputs](references/publication-inputs.md). Set `brief.sharedPost: true`, the
selected angle as `oneIdea`, and the three default channels. Write the master yourself, using
factual `sourceContext` or an actual human `maintainerSeed`. Make transport drafts mechanically
from the same master; preserve the title, body, CTA and alt text. Use Markdown list markers and
blank lines so Reddit and Discourse retain real paragraphs and lists. Write for people who know
Navet unless an introduction was requested. Use one main idea, concrete proof and one next action.

```sh
pnpm marketing:content:generate -- --brief <brief.yml> --master <master.json> --source-root <clean-source-checkout>
pnpm marketing:content:check -- --pack <pack-directory>
```

Every product claim needs an exact source locator. Capture only public-safe demo/fixture data
from the verified source. Review the actual image at feed size, facts, provider scope, voice,
visual identity, readability, alt text, links and the strictest platform limits. Record the
master/content hashes and actual image SHA-256. Script success alone is not visual review.
Show one actual unsent composer preview when access permits, with the final post and image.
Do not require the user to review all three composers. Label missing actual previews honestly;
never present a simulated preview as an actual composer. Check each platform's formatting yourself.

## Publish once per destination

Use browser control for Reddit and the existing Home Assistant topic. Verify the authenticated
account, exact destination and current community rules. Use the configured local incoming
webhook for Discord; inspect its name, server and channel through Discord's API. Browser login
is optional for webhook delivery. Its URL belongs in a permission-600 secret file under
`marketing/private/`, never copy, screenshots, receipts, logs or Git.

Retain the human request and single master approval bound to all requested destinations and the
image/alt text. Use `publish-community` authorization as documented in the reference. Prepare
each channel's immutable intent. For browser publication, claim `attempt` before submitting;
the webhook sender claims internally. Only `send-once` permits a send. Recheck unchanged copy,
image, account and destination immediately before submission, including after interruption.
`published` skips a channel; `reconcile-required` requires inspecting the owning platform.
Never resend after a timeout or uncertain acknowledgement. Preserve the attempt and report
uncertainty if it cannot be reconciled.

Read back the saved post, identity, destination, exact wording, link targets, paragraphs, lists
and screenshot. Record its permalink and observed evidence. Discord API readback verifies the
saved payload; inspect rendered appearance when accessible and identify unavailable visual
readback. Platforms may transform images and link labels; identify the source hash honestly.

Continue unaffected destinations when another is blocked. Report all three with published links
or concrete blockers. Retain masters, copy, evidence and progress in local deliverables, and
intent/attempt/receipt files in the shared publication ledger. Keep blocked WIP; clean completed
WIP through the existing scoped cleanup command. Local files are not a durable external backup.
