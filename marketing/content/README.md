# Navet community content workflow

This directory is the versioned input and public record for Navet's human-approved community
content. It turns verified product evidence and a real maintainer point of view into channel-native
drafts without automating publication.

## Editorial rhythm

Use a four-week rotation: a meaningful feature, a practical how-to, a standalone smart-home tip,
then a behind-the-scenes decision or community question. A meaningful release may replace the
weekly anchor. Publish every anchor to the Navet subreddit and Discord, narrate two YouTube videos
per month, and use external communities only when the subject directly serves them.

Durable how-to material belongs in Navet docs. Community versions must remain useful on their own
instead of becoming link teasers.

## Start a brief

Run:

```bash
pnpm marketing:content:new
```

The prompt captures five pieces of maintainer input: the problem, why it matters personally, one
specific detail or tradeoff, the current limitation, and the conversation or action worth having.
The generator does not invent those fields. A placeholder or missing answer blocks publishability.

Briefs live in `marketing/content/briefs/`. Claims must cite a current repository source and exact
locator. Supported evidence is deliberately narrow: the changelog, public docs, integration
matrix, product-marketing context, brand guidance, and explicit release diffs stored as files.

## Generate and review

```bash
pnpm marketing:content:generate -- --brief marketing/content/briefs/<brief>.yml
pnpm marketing:content:check -- --pack .cache/navet-content/<id>
```

Generated packs are ignored cache artifacts. Each contains an overview, evidence ledger, channel
drafts, docs angle, product-proof instructions, and a human review sheet. When `OPENAI_API_KEY` is
available, the generator requests structured alternatives using `NAVET_CONTENT_MODEL` (default:
`gpt-5.4-mini`). Without a key—or after any generation or validation failure—it writes a readable
deterministic fallback and marks it non-publishable.

Only public repository evidence and the maintainer seed are sent for generation. Set
`NAVET_CONTENT_GENERATION_ENABLED=false` to force the local fallback. Generated text is
scaffolding: read it aloud, edit it into words you would actually use, verify every claim, and
review the visual at feed size. Never use a real household dashboard for product proof.

## Publish manually and record the result

Publication is always manual. After editing the final copy into a file and publishing it yourself:

```bash
pnpm marketing:content:record -- \
  --pack .cache/navet-content/<id> \
  --channel navet-subreddit \
  --url https://example.com/the-public-post \
  --final-copy /path/to/final-copy.md \
  --confirm-human-reviewed
```

Optional aggregate results may be supplied later with `--metrics-file /path/to/metrics.json`.
The record command refuses generated copy, placeholders, unsupported links, or an omitted human
review confirmation.

To add the 24-hour or 7-day results later, copy `metrics.example.json`, fill only the signals the
channel actually exposes, then run:

```bash
pnpm marketing:content:record -- \
  --update-record marketing/content/published/<id>/<channel>.json \
  --metrics-file /path/to/metrics.json
```

Leave unavailable values as `null`; do not turn missing attribution into a zero or infer completed
installs from visits.

Owned and external community destinations are versioned in `channels.yml`. Update that file when
an official destination changes, but keep account credentials and publishing tokens out of the
repository.

## Weekly routine

- Monday: choose one anchor and record the maintainer seed.
- Tuesday: generate, verify evidence, and write or update the canonical docs article.
- Wednesday: capture demo-safe proof and record narration on video weeks.
- Thursday: check, manually publish, and stay available for replies.
- Friday: record URLs, useful questions, install-intent signals, and the next idea.

Before any external-community post, open its current rules URL in `channels.yml`, update
`rulesCheckedOn`, disclose **I maintain Navet**, and make most of the value available in the native
post. If asked about AI use, answer plainly: automation helped gather evidence and prepare drafts;
the maintainer supplied the point of view, verified the facts, edited the final words, and
published them.
