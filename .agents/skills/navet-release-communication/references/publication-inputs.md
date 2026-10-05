# Publication inputs

Run commands from the Navet workspace. All task files below belong in its ignored marketing WIP.
Default agent destinations are Navet Reddit, Navet Discord and
the configured existing Navet Home Assistant community topic. Include `homeassistant-community`
in authorization channels and approved posts for that topic; browser receipts identify the exact
reply permalink. This scope does not authorize other forum topics.
`generate --drafts` reads a JSON array of final drafts without an API key or extra generation call.
Existing maintainer-seeded briefs and manual recording remain supported.

## Brief and drafts

For every new community post, set `sharedPost: true` and select `release`, `feature`, `how-to`,
`tip`, `behind-the-scenes` or `general`. Default channels are `navet-subreddit`, `navet-discord`
and `homeassistant-community`. Include `home-assistant` in provider scope when this topic is
selected; qualify any provider-specific claims in the shared copy. A requested subset is allowed.
Use one title and body across transport drafts. Reddit's body omits the title; Discord and the
forum prepend the same title plus a blank line. Body wording, CTA and alt text must match exactly
after that mechanical title placement. Use Markdown lists consistently. Shared posts permit
1000 body characters on Reddit/Discord; all other hard limits and quality checks remain active.

Non-release posts retain an exact verified source commit and clean checkout; no release tag is
required. Feature availability still needs evidence from the public product. Release posts retain
the published tag and full changelog. A single composer preview is enough for approval; inspect
each destination's saved formatting and links after publication.

Before drafting a release, retain its full published changelog and source URL in the task. Ask
which headline news should drive the post, unless the maintainer has already supplied it. Store
`headlineNews: { text, requestReference }` and `changelog: { path, url }` in `progress.json`.
Use that selected news as the brief's `oneIdea`, supported by exact release evidence. The title,
opening and screenshot follow that lead; up to three compact supporting points summarize other
changelog entries, with a link to the full published changelog. The headline answer does not
authorize publication.

Use `schemaVersion: 1`, stable slug `id`, `createdOn`, the selected `kind`, `title`, `oneIdea`,
`audience`, `providerScope`, `evidence`, `canonicalDocs`, `cta`, `asset` and `channels` as in
`scripts/content-cli.mjs`. Replace `maintainerSeed` with factual `sourceContext` containing
`problem`, `benefit`, `specificDetail`, `limitation`, `nextAction`. Do not invent a personal opinion.
Evidence entries contain `id`, allowlisted repository `source`, exact `locator`, `claim` and
`verifiedOn`; see `scripts/content-workflow.mjs` for current evidence and capture validation.

Each draft has `channelId`, `title`, final `body` including the CTA URL, `script: ""`,
`description`, `evidenceIds`, `cta: {label, url}`, `assetAltText`. Discord body starts with the exact
title followed by a blank line. Its body includes all text sent to Discord and counts toward limits.
Use `generate --master <master.json> --source-root <clean-source-checkout>` from the current
tooling workspace. The master JSON contains `title`, `body` without a repeated title, `description`,
`evidenceIds`, `cta` and `assetAltText`. The generator mechanically creates all three transport
drafts; `--drafts` remains available for retained inputs. Resolve evidence and capture fixtures in
that checkout. For releases, the published tag must resolve locally there and match HEAD;
all posts reject tracked source modifications at prepare and attempt.
Asset metadata has `kind: image`, `sha256`, `altText`, `width`, `height`; an HTTPS `publicUrl`
is optional until upload. Match alt text to the draft. Compute SHA-256 from the actual local image.

## Authorization and quality review

For new shared posts, use `action: "publish-community"` and retain all requested channels. For
release posts keep the `release` object below. For other kinds replace it with
`sourceSnapshot: { "sourceHead": "<40-character verified commit>" }`. Source verification checks
the clean checkout and committed evidence at that head before prepare and attempt.

The single `approval` includes `masterPost: { title, body, assetSha256, assetAltText }`, where
`body` is the master body without a repeated title. Its `posts` array binds the transport content
hash, screenshot hash, alt text and exact destination for every requested channel. Obtain one
human approval of that displayed master; do not fabricate separate platform approvals. Shared
draft validation rejects editorial differences, and prepare/attempt require the matching master.
Use the same approval reference across every intent. The quality review account is `awesomestvi`
for browser posts and the verified webhook name for Discord.

Shared post intent/attempt/receipt files live under `publications/post-<brief-id>/`, preventing
duplicate sends per task/channel while allowing distinct feature/general posts at the same source
head. Existing release intents remain supported under `publications/release-<tag>/`.

Authorization is a JSON object:

```json
{
  "action": "publish-community",
  "source": "codex-user",
  "requestId": "<stable request identifier>",
  "requestReference": "<actual human turn reference>",
  "requestedAt": "<observed ISO timestamp>",
  "channels": ["navet-subreddit", "navet-discord", "homeassistant-community"],
  "approval": {
    "source": "codex-user",
    "reference": "<single human approval of the shown package>",
    "approvedAt": "<observed ISO timestamp>",
    "masterPost": {
      "title": "<approved master title>",
      "body": "<approved master body without repeated title>",
      "assetSha256": "<approved screenshot hash>",
      "assetAltText": "<approved alt text>"
    },
    "posts": [
      {
        "channelId": "navet-subreddit",
        "contentHash": "<hash of approved title and body>",
        "assetSha256": "<hash of approved screenshot>",
        "assetAltText": "<approved alt text>",
        "destinationUrl": "https://www.reddit.com/r/navet"
      },
      {
        "channelId": "navet-discord",
        "contentHash": "<hash with title prepended to body>",
        "assetSha256": "<same screenshot hash>",
        "assetAltText": "<same approved alt text>",
        "destinationUrl": "https://discord.com/channels/1540491864325623892/1540491865143386276"
      },
      {
        "channelId": "homeassistant-community",
        "contentHash": "<hash with title prepended to body>",
        "assetSha256": "<same screenshot hash>",
        "assetAltText": "<same approved alt text>",
        "destinationUrl": "https://community.home-assistant.io/t/navet-a-smart-home-dashboard-for-wall-panels-tablets-and-phones/1010760"
      }
    ]
  },
  "release": {
    "tag": "<published tag>",
    "sourceHead": "<full 40-character release commit>",
    "url": "https://github.com/awesomestvi/navet/releases/tag/<published tag>",
    "publishedAt": "<GitHub published timestamp>"
  }
}
```

The single approval's `posts` array includes every destination for the same approved master.
Use the same approval reference for all channels; do not request separate channel approvals.
Compute hashes after showing the exact final copy and screenshot, then bind them to the human's
approval. A posting request or an agent quality check is not this final approval.

For each channel, quality review JSON contains `channelId`, `contentHash`, `assetSha256`, `sourceHead`,
`reviewer`, observed `account`, exact `destinationUrl`, `reviewedAt`, and `evidence` with nonempty
observed references for `facts`, `providerScope`, `voice`, `visualIdentity`, `feedReadability`,
`accessibility`, `links`. These references explain what was reviewed and where its evidence lives.
Compute `contentHash` with the exported `publicationContentHash({title, body})` helper, preserving
exact final text. It hashes JSON containing both title and body. The source head is the head of
the capture/source, not the workflow tooling checkout.

```sh
pnpm marketing:content:prepare -- --pack <directory> --channel <channel-id> --authorization <authorization.json> --review <review.json> --asset-metadata <asset.json>
pnpm marketing:content:attempt -- --intent <returned-intent-path>
```

Prepare retains immutable intent per post/channel; attempt claims one send with an exclusive
file. Inspect the returned status before operating the browser. Files remain in the ignored
`marketing/deliverables/community/publications/post-<brief-id>/` directory. They prevent duplicate
sends in this workspace; separate machines need the same durable ledger before publishing.

## Readback receipt

### Discord webhook sender

Create an incoming webhook in Discord Server Settings → Integrations, select the exact Navet
announcements channel, and set its name/avatar. Review that identity with the final package;
use the webhook's exact name as the quality review `account`. The human approval covers the
displayed content, image and destination. Keep the URL in
`marketing/private/discord-webhook-url` (or another private local file) with permissions `600`.
Never put it in tracked configuration, task JSON, command arguments, receipts or chat.

After `prepare`, invoke the sender directly; it performs `attempt` internally:

```sh
node scripts/discord-webhook.mjs --intent <intent-path> --asset <approved-local-image> --secret-file marketing/private/discord-webhook-url
```

The sender checks webhook metadata, the approved content hash and image SHA-256, then makes one
request with mentions disabled. It reads the returned message through Discord's API and checks
content, channel, webhook identity, attachment name, alt text and byte size before recording
method `agent-discord-webhook`. This verifies source bytes before upload and API readback, not
rendered appearance or Discord's stored byte hash. Inspect the rendered message when accessible.
A timeout, failed request or mismatched readback retains the send attempt and requires manual
reconciliation; repeating the command cannot automatically resend. Setup never sends a test
message to the public channel.

### Browser receipts

Receipt JSON contains `publicUrl` (post/message permalink), observed `account`, exact
`destinationUrl`, `title`, `body`, `assetSha256`, `observedAt`, and `evidence` (actual browser
readback reference). Record the reviewed title for Discord even though it appears as part of
the message rather than a platform title field. Readback must verify that title is present.
Preserve source text while checking the rendered platform representation; Markdown rendering
does not change the retained source hash. `assetSha256` identifies the inspected source image.
Readback must follow the retained attempt and be observed within 24 hours of recording.

```sh
pnpm marketing:content:record -- --intent <intent-path> --receipt <receipt.json>
```

Version 2 records contain authorization, review, method `agent-browser` or
`agent-discord-webhook`, and readback. Their
`humanReviewed` is true because the maintainer approved the exact package; `publishedManually`
is false. Version 1 manual records keep their
meaning and remain eligible as maintainer voice examples. Agent posts do not automatically
become examples of the maintainer's personal voice.
