import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { publishDiscordWebhook, loadWebhookSecret, webhookEndpoint } from './discord-webhook.mjs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  attemptPublication,
  preparePublication,
  publicationContentHash,
  recordAgentPublication,
} from './content-publication.mjs';

const roots = [];
const now = new Date('2026-10-05T12:00:00Z');
function fixture(channelId = 'navet-subreddit') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'navet-publication-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'docs', 'branding'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.writeFileSync(
    path.join(root, 'docs', 'branding', 'VOICE_AND_MESSAGING.md'),
    '### Social and community\nUse concrete proof.\n'
  );
  fs.writeFileSync(
    path.join(root, 'scripts', 'capture-marketing-media.mjs'),
    "// name: 'navet-ipad-landscape-home'\n"
  );
  const git = (args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git(['init', '--quiet']);
  git(['add', 'docs', 'scripts']);
  git([
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.com',
    'commit',
    '--quiet',
    '-m',
    'test: publication source fixture',
  ]);
  git(['tag', 'v0.17.1']);
  const draft = {
    channelId,
    title: 'Navet release update',
    body: `${channelId === 'navet-discord' ? 'Navet release update\n\n' : ''}See room controls beside current state. Explore the demo: https://demo.navet.app/`,
    script: '',
    description: 'Release update.',
    evidenceIds: ['voice'],
    cta: { label: 'Explore the demo', url: 'https://demo.navet.app/' },
    assetAltText: 'Navet Home with room controls and current state.',
  };
  const pack = {
    id: 'release-update',
    sourceRoot: root,
    generator: { mode: 'agent-authored' },
    brief: {
      schemaVersion: 1,
      id: 'release-update',
      createdOn: '2026-10-05',
      kind: 'release',
      title: draft.title,
      oneIdea: 'Room controls beside state.',
      audience: 'Navet households.',
      sourceContext: {
        problem: 'Finding a room action.',
        benefit: 'Clear daily controls.',
        specificDetail: 'State beside controls.',
        limitation: 'Provider capabilities vary.',
        nextAction: 'Explore the demo.',
      },
      providerScope: channelId === 'homeassistant-community' ? ['home-assistant'] : ['provider-neutral'],
      channels: [channelId],
      cta: draft.cta,
      asset: {
        kind: 'screenshot',
        scenario: 'navet-ipad-landscape-home',
        sourcePolicy: 'provider-free-demo-only',
        altText: draft.assetAltText,
      },
      evidence: [
        {
          id: 'voice',
          source: 'docs/branding/VOICE_AND_MESSAGING.md',
          locator: '### Social and community',
          claim: 'Use concrete proof.',
          verifiedOn: '2026-10-05',
        },
      ],
    },
    drafts: [draft],
  };
  const release = {
    tag: 'v0.17.1',
    sourceHead: git(['rev-parse', 'HEAD']),
    url: 'https://github.com/awesomestvi/navet/releases/tag/v0.17.1',
    publishedAt: '2026-10-01T12:00:00Z',
  };
  const authorization = {
    action: 'publish-release',
    source: 'codex-user',
    requestId: 'turn-1',
    requestReference: 'Human turn 1: post latest release updates',
    requestedAt: now.toISOString(),
    channels: ['navet-subreddit', 'navet-discord'],
    release,
  };
  const asset = {
    kind: 'image',
    sha256: 'b'.repeat(64),
    altText: draft.assetAltText,
    width: 1200,
    height: 800,
  };
  const destinationUrl =
    channelId === 'homeassistant-community'
      ? 'https://community.home-assistant.io/t/navet-a-smart-home-dashboard-for-wall-panels-tablets-and-phones/1010760'
      : channelId === 'navet-subreddit'
      ? 'https://www.reddit.com/r/navet'
      : 'https://discord.com/channels/1540491864325623892/12345';
  const review = {
    channelId,
    contentHash: publicationContentHash(draft),
    assetSha256: asset.sha256,
    sourceHead: release.sourceHead,
    reviewer: 'content-review',
    account: 'navet-maintainer',
    destinationUrl,
    reviewedAt: now.toISOString(),
    evidence: Object.fromEntries(
      [
        'facts',
        'providerScope',
        'voice',
        'visualIdentity',
        'feedReadability',
        'accessibility',
        'links',
      ].map((key) => [key, `Observed ${key} in retained review evidence`])
    ),
  };
  authorization.approval = {
    source: 'codex-user',
    reference: 'Human turn 2: approved the shown post and screenshot',
    approvedAt: now.toISOString(),
    posts: [
      {
        channelId,
        contentHash: review.contentHash,
        assetSha256: asset.sha256,
        assetAltText: asset.altText,
        destinationUrl,
      },
    ],
  };
  const receipt = {
    publicUrl:
      channelId === 'navet-subreddit'
        ? 'https://www.reddit.com/r/navet/comments/abc123/update/'
        : `${destinationUrl}/67890`,
    destinationUrl,
    account: review.account,
    title: draft.title,
    body: draft.body,
    assetSha256: asset.sha256,
    observedAt: now.toISOString(),
    evidence: 'Observed browser post and uploaded image.',
  };
  if (channelId === 'homeassistant-community') authorization.channels.push(channelId);
  return { root, now, pack, channelId, authorization, review, asset, receipt };
}
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Discord webhook publication', () => {
  function setup() {
    const input = fixture('navet-discord');
    const assetPath = path.join(input.root, 'screenshot.png');
    fs.writeFileSync(assetPath, 'fixture image');
    input.asset.sha256 = crypto.createHash('sha256').update('fixture image').digest('hex');
    input.review.assetSha256 = input.asset.sha256;
    input.authorization.approval.posts[0].assetSha256 = input.asset.sha256;
    const prepared = preparePublication(input);
    const webhook = { id: '999', type: 1, guild_id: '1540491864325623892', channel_id: '12345', name: input.review.account };
    const message = { id: '67890', channel_id: '12345', webhook_id: '999',
      author: { username: input.review.account }, content: input.pack.drafts[0].body,
      attachments: [{ filename: 'navet-release.png', description: input.asset.altText, size: 13 }] };
    return { input, prepared, webhook, message, options: {
      ...input, ...prepared, assetPath, webhookUrl: 'https://discord.com/api/webhooks/999/fixture-secret',
    } };
  }
  it('sends the approved attachment once, disables mentions and retains API readback', async () => {
    const f = setup();
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      if (options.method === 'POST') {
        expect(fs.existsSync(f.prepared.attemptPath)).toBe(true);
        expect(JSON.parse(options.body.get('payload_json')).allowed_mentions).toEqual({ parse: [] });
        expect(options.body.get('files[0]').size).toBe(13);
      }
      return { ok: true, json: async () => url.includes('/messages/') ? f.message :
        options.method === 'POST' ? { id: '67890' } : f.webhook };
    };
    expect((await publishDiscordWebhook({ ...f.options, fetchImpl })).status).toBe('recorded');
    expect(JSON.parse(fs.readFileSync(f.prepared.recordPath)).publicationMethod).toBe('agent-discord-webhook');
    expect((await publishDiscordWebhook({ ...f.options, fetchImpl })).status).toBe('published');
    expect(calls.filter(call => call.options.method === 'POST')).toHaveLength(1);
  });
  it('blocks a webhook in the wrong channel before claiming a send', async () => {
    const f = setup();
    const fetchImpl = async () => ({ ok: true, json: async () => ({ ...f.webhook, channel_id: '321' }) });
    await expect(publishDiscordWebhook({ ...f.options, fetchImpl })).rejects.toThrow('identity or destination');
    expect(fs.existsSync(f.prepared.attemptPath)).toBe(false);
  });
  it('retains an uncertain send and refuses to retry after a network error', async () => {
    const f = setup();
    let sends = 0;
    const fetchImpl = async (_url, options) => {
      if (options.method === 'POST') { sends++; throw new Error(f.options.webhookUrl); }
      return { ok: true, json: async () => f.webhook };
    };
    await expect(publishDiscordWebhook({ ...f.options, fetchImpl })).rejects.toThrow('reconcile');
    expect((await publishDiscordWebhook({ ...f.options, fetchImpl })).status).toBe('reconcile-required');
    expect(sends).toBe(1);
  });
  it('does not record mismatched API readback', async () => {
    const f = setup();
    const fetchImpl = async (url, options) => ({ ok: true, json: async () => url.includes('/messages/') ?
      { ...f.message, content: 'wrong content' } : options.method === 'POST' ? { id: '67890' } : f.webhook });
    await expect(publishDiscordWebhook({ ...f.options, fetchImpl })).rejects.toThrow('readback differs');
    expect(fs.existsSync(f.prepared.recordPath)).toBe(false);
    expect(fs.existsSync(f.prepared.attemptPath)).toBe(true);
  });
  it('rejects untrusted endpoints and readable secret files', () => {
    expect(() => webhookEndpoint('https://example.com/api/webhooks/999/token')).toThrow();
    expect(() => webhookEndpoint('https://discord.com/api/webhooks/999/token?wait=true')).toThrow();
    const input = fixture();
    const file = path.join(input.root, 'secret');
    fs.writeFileSync(file, 'https://discord.com/api/webhooks/999/token', { mode: 0o644 });
    expect(() => loadWebhookSecret(file)).toThrow('permissions 600');
    fs.chmodSync(file, 0o600);
    expect(loadWebhookSecret(file)).toBe('https://discord.com/api/webhooks/999/token');
  });
});

describe('request-authorized release publication', () => {
  function sharedFixture(kind = 'general') {
    const input = fixture();
    input.pack.brief.kind = kind;
    input.pack.brief.sharedPost = true;
    input.pack.brief.providerScope = ['provider-neutral', 'home-assistant'];
    const channels = ['navet-subreddit', 'navet-discord', 'homeassistant-community'];
    input.pack.brief.channels = channels;
    const master = input.pack.drafts[0];
    input.pack.drafts = channels.map(channelId => ({ ...master, channelId,
      body: channelId === 'navet-subreddit' ? master.body : `${master.title}\n\n${master.body}` }));
    input.authorization.action = 'publish-community';
    input.authorization.channels = channels;
    input.authorization.sourceSnapshot = { sourceHead: input.authorization.release.sourceHead };
    delete input.authorization.release;
    input.authorization.approval.masterPost = { title: master.title, body: master.body,
      assetSha256: input.asset.sha256, assetAltText: input.asset.altText };
    input.authorization.approval.posts = input.pack.drafts.map(draft => ({
      channelId: draft.channelId, contentHash: publicationContentHash(draft),
      assetSha256: input.asset.sha256, assetAltText: input.asset.altText,
      destinationUrl: draft.channelId === 'navet-subreddit' ? 'https://www.reddit.com/r/navet' :
        draft.channelId === 'navet-discord' ? 'https://discord.com/channels/1540491864325623892/12345' :
          'https://community.home-assistant.io/t/navet-a-smart-home-dashboard-for-wall-panels-tablets-and-phones/1010760',
    }));
    return input;
  }
  it.each(['feature', 'general', 'tip', 'behind-the-scenes'])('publishes one approved %s master to all three without a release tag', kind => {
    const input = sharedFixture(kind);
    execFileSync('git', ['-C', input.root, 'tag', '-d', 'v0.17.1'], { stdio: 'ignore' });
    for (const post of input.authorization.approval.posts) {
      const review = { ...input.review, channelId: post.channelId, contentHash: post.contentHash,
        destinationUrl: post.destinationUrl };
      const prepared = preparePublication({ ...input, channelId: post.channelId, review });
      expect(prepared.intentPath).toContain('post-release-update');
      expect(attemptPublication({ ...prepared, root: input.root, now }).status).toBe('send-once');
      const draft = input.pack.drafts.find(x => x.channelId === post.channelId);
      expect(recordAgentPublication({ ...prepared, root: input.root, now, receipt: {
        ...input.receipt, body: draft.body, destinationUrl: post.destinationUrl,
        publicUrl: post.channelId === 'navet-subreddit' ? input.receipt.publicUrl : `${post.destinationUrl}/67890`,
      } }).status).toBe('recorded');
      expect(attemptPublication({ ...prepared, root: input.root, now }).status).toBe('published');
    }
  });
  it('rejects platform rewrites, a changed master and incomplete destination approval', () => {
    const input = sharedFixture();
    input.pack.drafts[1].body += ' Changed copy.';
    expect(() => preparePublication(input)).toThrow('Shared post drafts');
    input.pack.drafts[1].body = `${input.pack.drafts[0].title}\n\n${input.pack.drafts[0].body}`;
    input.authorization.approval.masterPost.body += ' Unapproved change.';
    expect(() => preparePublication(input)).toThrow('Single-post approval');
    input.authorization.approval.masterPost.body = input.pack.drafts[0].body;
    input.authorization.approval.posts.pop();
    expect(() => preparePublication(input)).toThrow('Single-post approval');
  });
  it('rejects an unverified non-release source head and keeps tagged release requirements', () => {
    const input = sharedFixture();
    input.authorization.sourceSnapshot.sourceHead = 'f'.repeat(40);
    expect(() => preparePublication(input)).toThrow('source head');
    const release = sharedFixture('release');
    expect(() => preparePublication(release)).toThrow('published Navet release');
  });
  it.each(['navet-subreddit', 'navet-discord', 'homeassistant-community'])(
    'retains truthful %s receipts and makes restart recording idempotent',
    (channelId) => {
      const input = fixture(channelId);
      const prepared = preparePublication(input);
      expect(prepared.status).toBe('prepared');
      expect(() => recordAgentPublication({ ...input, ...prepared })).toThrow(
        'No retained send attempt'
      );
      expect(attemptPublication({ ...input, ...prepared }).status).toBe('send-once');
      expect(attemptPublication({ ...input, ...prepared }).status).toBe('reconcile-required');
      expect(recordAgentPublication({ ...input, ...prepared }).status).toBe('recorded');
      expect(recordAgentPublication({ ...input, ...prepared }).status).toBe('already-recorded');
      expect(preparePublication(input).status).toBe('published');
      const record = JSON.parse(fs.readFileSync(prepared.recordPath, 'utf8'));
      expect(record).toMatchObject({
        schemaVersion: 2,
        humanReviewed: true,
        publishedManually: false,
        publicationMethod: 'agent-browser',
        finalTitle: input.receipt.title,
      });
    }
  );

  it('limits Home Assistant replies to the configured existing Navet topic', () => {
    const input = fixture('homeassistant-community');
    expect(() => preparePublication({ ...input, review: { ...input.review,
      destinationUrl: 'https://community.home-assistant.io/t/another-topic/123' } })).toThrow('existing Navet topic');
  });

  it('blocks unauthorized destinations, stale heads, changed content and missing visual evidence', () => {
    const input = fixture();
    expect(() =>
      preparePublication({ ...input, authorization: { ...input.authorization, action: 'draft' } })
    ).toThrow('explicit human request');
    expect(() => preparePublication({ ...input, channelId: 'homeassistant-reddit' })).toThrow(
      'only Navet Reddit and Discord'
    );
    expect(() =>
      preparePublication({
        ...input,
        review: { ...input.review, destinationUrl: 'https://www.reddit.com/r/homeassistant' },
      })
    ).toThrow('r/navet');
    expect(() =>
      preparePublication({ ...input, review: { ...input.review, sourceHead: 'c'.repeat(40) } })
    ).toThrow('Quality review');
    expect(() =>
      preparePublication({ ...input, review: { ...input.review, contentHash: 'd'.repeat(64) } })
    ).toThrow('Quality review');
    expect(() =>
      preparePublication({
        ...input,
        review: { ...input.review, evidence: { ...input.review.evidence, visualIdentity: '' } },
      })
    ).toThrow('Quality review');
    expect(() =>
      preparePublication({ ...input, asset: { ...input.asset, altText: 'Different capture' } })
    ).toThrow('matching alt text');
    const wrongDiscord = fixture('navet-discord');
    expect(() =>
      preparePublication({
        ...wrongDiscord,
        review: {
          ...wrongDiscord.review,
          destinationUrl: 'https://discord.com/channels/99999/12345',
        },
      })
    ).toThrow('exact channel');
  });

  it('does not trust a saved eligible flag or accept hype in the final pack', () => {
    const input = fixture();
    input.pack.publishEligible = true;
    input.pack.drafts[0].body = 'Revolutionary update. https://demo.navet.app/';
    expect(() => preparePublication(input)).toThrow('disallowed promotional copy');
  });

  it('requires the Discord title in the exact message payload and clean tagged release source', () => {
    const input = fixture('navet-discord');
    input.pack.drafts[0].body = 'See current state. https://demo.navet.app/';
    expect(() => preparePublication(input)).toThrow('Discord body');
    const dirty = fixture();
    fs.appendFileSync(
      path.join(dirty.root, 'docs', 'branding', 'VOICE_AND_MESSAGING.md'),
      'Changed source.'
    );
    expect(() => preparePublication(dirty)).toThrow('clean and match');
    const wrongHead = fixture();
    wrongHead.authorization.release.sourceHead = 'c'.repeat(40);
    expect(() => preparePublication(wrongHead)).toThrow('clean and match');
    const untracked = fixture();
    fs.mkdirSync(path.join(untracked.root, 'docs', 'guide'), { recursive: true });
    fs.writeFileSync(
      path.join(untracked.root, 'docs', 'guide', 'unreleased.md'),
      'Unreleased feature.'
    );
    untracked.pack.brief.evidence[0] = {
      ...untracked.pack.brief.evidence[0],
      source: 'docs/guide/unreleased.md',
      locator: 'Unreleased feature.',
    };
    expect(() => preparePublication(untracked)).toThrow('not a file in the published commit');
  });

  it('keeps uncertain sends blocked across new pack ids and preserves successful channels', () => {
    const input = fixture();
    const reddit = preparePublication(input);
    attemptPublication({ ...input, ...reddit });
    recordAgentPublication({ ...input, ...reddit });
    const discord = fixture('navet-discord');
    discord.root = input.root;
    const pending = preparePublication(discord);
    attemptPublication({ ...discord, ...pending });
    discord.pack.id = 'new-task-id';
    discord.authorization.requestId = 'another-request';
    expect(preparePublication(discord).status).toBe('reconcile-required');
    expect(preparePublication(input).status).toBe('published');
    expect(attemptPublication({ ...discord, ...pending }).status).toBe('reconcile-required');
  });

  it('rejects readback from a wrong account, destination, content, screenshot or post URL', () => {
    const input = fixture();
    const prepared = preparePublication(input);
    attemptPublication({ ...input, ...prepared });
    for (const change of [
      { account: 'someone-else' },
      { body: 'Different content' },
      { title: 'Different title' },
      { assetSha256: 'c'.repeat(64) },
      { destinationUrl: 'https://www.reddit.com/r/other' },
    ]) {
      expect(() =>
        recordAgentPublication({ ...input, ...prepared, receipt: { ...input.receipt, ...change } })
      ).toThrow('Browser readback');
    }
    expect(() =>
      recordAgentPublication({
        ...input,
        ...prepared,
        receipt: {
          ...input.receipt,
          publicUrl: 'https://www.reddit.com/r/homeassistant/comments/abc123/',
        },
      })
    ).toThrow('exact destination');
    expect(() =>
      recordAgentPublication({
        ...input,
        ...prepared,
        receipt: { ...input.receipt, observedAt: '2026-10-04T12:00:00Z' },
      })
    ).toThrow('predates');
  });

  it('cannot silently replace a retained intent with revised copy or another release head', () => {
    const input = fixture();
    preparePublication(input);
    input.pack.drafts[0].title = 'Changed title';
    input.review.contentHash = publicationContentHash(input.pack.drafts[0]);
    input.authorization.approval.posts[0].contentHash = input.review.contentHash;
    expect(() => preparePublication(input)).toThrow('different retained intent');
  });

  it('does not report corrupt or mismatched retained receipts as published after a restart', () => {
    const input = fixture();
    const prepared = preparePublication(input);
    attemptPublication({ ...input, ...prepared });
    recordAgentPublication({ ...input, ...prepared });
    const saved = JSON.parse(fs.readFileSync(prepared.recordPath, 'utf8'));
    for (const value of [
      '',
      '{"schemaVersion":',
      JSON.stringify({ ...saved, finalCopy: 'Other content' }),
    ]) {
      fs.writeFileSync(prepared.recordPath, value);
      expect(preparePublication(input).status).toBe('reconcile-required');
      expect(attemptPublication({ ...input, ...prepared }).status).toBe('reconcile-required');
    }
  });

  it('requires final approval and invalidates it when the copy or screenshot changes', () => {
    const input = fixture();
    expect(() =>
      preparePublication({
        ...input,
        authorization: { ...input.authorization, approval: undefined },
      })
    ).toThrow('Maintainer approval');
    input.pack.drafts[0].title = 'Revised post';
    input.review.contentHash = publicationContentHash(input.pack.drafts[0]);
    expect(() => preparePublication(input)).toThrow('Maintainer approval');
    input.authorization.approval.posts[0].contentHash = input.review.contentHash;
    input.asset.sha256 = 'c'.repeat(64);
    input.review.assetSha256 = input.asset.sha256;
    expect(() => preparePublication(input)).toThrow('Maintainer approval');
  });

  it('accepts one package approval for all included destinations without channel-specific approval requests', () => {
    const reddit = fixture();
    const discord = fixture('navet-discord');
    const approval = {
      ...reddit.authorization.approval,
      posts: [...reddit.authorization.approval.posts, ...discord.authorization.approval.posts],
    };
    reddit.authorization.approval = approval;
    discord.authorization.approval = approval;
    discord.root = reddit.root;
    expect(preparePublication(reddit).status).toBe('prepared');
    expect(preparePublication(discord).status).toBe('prepared');
    discord.authorization.approval = {
      ...approval,
      posts: approval.posts.filter((post) => post.channelId !== 'navet-discord'),
    };
    expect(() => preparePublication(discord)).toThrow('Maintainer approval');
  });
});
