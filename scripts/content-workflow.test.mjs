import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkContentPack,
  createFallbackDrafts,
  generateContentPack,
  jaccardSimilarity,
  loadChannelConfig,
  loadPublishedVoiceExamples,
  repoRoot,
  validateBrief,
  validateDrafts,
  validateFinalCopy,
  validateMetrics,
} from './content-workflow.mjs';

const temporaryDirectories = [];
const fixedNow = new Date('2026-09-01T12:00:00.000Z');

function makeBrief(overrides = {}) {
  return {
    schemaVersion: 1,
    id: '2026-09-01-test-content',
    createdOn: '2026-09-01',
    kind: 'feature',
    title: 'Control lights by room',
    oneIdea: 'Room controls keep a common household action close to the live state.',
    audience: 'People using Navet for everyday lighting control.',
    maintainerSeed: {
      problem: 'Whole-home light lists make a room-level action harder to find.',
      whyItMatters: 'I want the dashboard to match how people talk about the home.',
      specificDetail: 'The room control sits beside the current room state.',
      limitation: 'Available controls still depend on the connected provider.',
      desiredConversation: 'Which room action do you reach for most often?',
    },
    providerScope: ['provider-neutral'],
    evidence: [
      {
        id: 'voice-standard',
        source: 'docs/branding/VOICE_AND_MESSAGING.md',
        locator: '### Social and community',
        claim: 'Navet community posts use one idea, one proof point, and one next action.',
        verifiedOn: '2026-09-01',
      },
    ],
    canonicalDocs: { path: '', status: 'not-applicable', angle: '' },
    cta: { label: 'Explore the demo', url: 'https://demo.navet.app/' },
    asset: {
      kind: 'screenshot',
      scenario: 'navet-ipad-landscape-home',
      sourcePolicy: 'provider-free-demo-only',
      altText: 'Navet Home showing room lighting controls beside current light state.',
    },
    channels: ['navet-subreddit'],
    publishing: {
      cadence: 'weekly-anchor',
      externalCommunity: false,
      humanApprovalRequired: true,
    },
    ...overrides,
  };
}

function validDraft(channelId = 'navet-subreddit') {
  return {
    channelId,
    title: 'Control lights by room',
    body:
      'Room controls keep a common household action beside the live state. The connected provider remains the source of truth. Which room action do you reach for most often?',
    script: '',
    description: 'A native community update with a concrete product detail.',
    evidenceIds: ['voice-standard'],
    cta: { label: 'Explore the demo', url: 'https://demo.navet.app/' },
    assetAltText: 'Navet Home showing room lighting controls beside current light state.',
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('content brief validation', () => {
  it('keeps the official Navet community destinations in the channel registry', () => {
    const channels = loadChannelConfig().channels;
    expect(channels['navet-subreddit'].destinationUrl).toBe('https://www.reddit.com/r/navet/');
    expect(channels.youtube.destinationUrl).toBe('https://www.youtube.com/@navetapp');
    expect(channels['navet-discord'].destinationUrl).toBe(
      'https://discord.com/channels/1540491864325623892'
    );
  });

  it.each(['feature', 'release', 'how-to', 'tip', 'behind-the-scenes'])(
    'accepts a complete %s brief fixture',
    (kind) => {
      const brief = makeBrief({
        kind,
        canonicalDocs:
          kind === 'how-to'
            ? {
                path: 'docs/guide/how-to/control-lights-by-room.md',
                status: 'existing',
                angle: 'A durable room-control guide.',
              }
            : { path: '', status: 'not-applicable', angle: '' },
      });
      const result = validateBrief(brief, loadChannelConfig(), { now: fixedNow });
      expect(result.errors).toEqual([]);
    }
  );

  it('blocks a missing or placeholder maintainer point of view', () => {
    const brief = makeBrief({
      maintainerSeed: {
        ...makeBrief().maintainerSeed,
        whyItMatters: 'PENDING: Add your answer.',
      },
    });
    expect(validateBrief(brief, loadChannelConfig(), { now: fixedNow }).errors).toContain(
      'Maintainer seed whyItMatters still contains a placeholder.'
    );
  });

  it('accepts an exact provider-free Storybook fixture as product proof', () => {
    const brief = makeBrief({
      asset: {
        kind: 'video-and-screenshot',
        scenario: 'storybook-assist-small',
        fixtureSource:
          'packages/app/src/features/dashboard/components/custom-card-assist.stories.tsx',
        fixtureLocator: 'export const Small',
        sourcePolicy: 'provider-free-demo-only',
        altText: 'Navet Assist open over a dashboard using fixture data.',
      },
    });

    expect(validateBrief(brief, loadChannelConfig(), { now: fixedNow }).errors).toEqual([]);
  });

  it('blocks a product-proof fixture when its exact locator is missing', () => {
    const brief = makeBrief({
      asset: {
        ...makeBrief().asset,
        scenario: 'storybook-missing-story',
        fixtureSource:
          'packages/app/src/features/dashboard/components/custom-card-assist.stories.tsx',
        fixtureLocator: 'export const ThisStoryDoesNotExist',
      },
    });

    expect(validateBrief(brief, loadChannelConfig(), { now: fixedNow }).errors).toEqual(
      expect.arrayContaining([
        'Brief asset fixtureLocator was not found in packages/app/src/features/dashboard/components/custom-card-assist.stories.tsx.',
        'Asset scenario "storybook-missing-story" is not a registered capture or verified repository fixture.',
      ])
    );
  });

  it('blocks an external provider community outside the brief provider scope', () => {
    const brief = makeBrief({ channels: ['homey-reddit'] });
    expect(validateBrief(brief, loadChannelConfig(), { now: fixedNow }).errors).toContain(
      'Homey subreddit requires provider scope homey, but the brief does not include it.'
    );
  });

  it.each([
    ['homeassistant-reddit', 'home-assistant'],
    ['homey-reddit', 'homey'],
    ['openhab-reddit', 'openhab'],
    ['selfhosted-reddit', 'provider-neutral'],
  ])('accepts a scoped, disclosed %s community fixture', (channelId, provider) => {
    const brief = makeBrief({ providerScope: [provider], channels: [channelId] });
    const config = loadChannelConfig();
    const briefResult = validateBrief(brief, config, { now: fixedNow });
    expect(briefResult.errors).toEqual([]);
    const draft = {
      ...validDraft(channelId),
      body:
        'I maintain Navet. Room controls keep a common household action beside live state, while the connected provider remains the source of truth. The linked demo shows the current interface.',
    };
    expect(validateDrafts([draft], brief, config).errors).toEqual([]);
  });

  it('blocks stale community rules, missing evidence locators, and non-allowlisted links', () => {
    const config = loadChannelConfig();
    config.channels['homeassistant-reddit'].rulesCheckedOn = '2026-06-01';
    const brief = makeBrief({
      providerScope: ['home-assistant'],
      channels: ['homeassistant-reddit'],
      cta: { label: 'Read more', url: 'https://tracking.example.com/install' },
      evidence: [
        {
          ...makeBrief().evidence[0],
          locator: 'This locator does not exist in the voice guide.',
        },
      ],
    });
    const result = validateBrief(brief, config, { now: fixedNow });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Evidence 1 locator was not found in docs/branding/VOICE_AND_MESSAGING.md.',
        'Brief CTA must use HTTPS on an allowlisted Navet or GitHub host.',
        'Home Assistant subreddit rules check is stale; verify the rules again before drafting.',
      ])
    );
  });
});

describe('channel draft validation', () => {
  it('rejects hype, unsupported metrics, and missing external disclosure', () => {
    const brief = makeBrief({
      providerScope: ['home-assistant'],
      channels: ['homeassistant-reddit'],
    });
    const draft = {
      ...validDraft('homeassistant-reddit'),
      body: 'This revolutionary update is used by 10000 users and changes everything.',
    };
    const result = validateDrafts([draft], brief, loadChannelConfig());
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Home Assistant subreddit draft contains disallowed promotional copy.',
        'Home Assistant subreddit draft contains an unsupported adoption metric.',
        'Home Assistant subreddit draft is missing the required affiliation disclosure.',
      ])
    );
  });

  it('rejects near-identical cross-posts', () => {
    const brief = makeBrief({ channels: ['navet-subreddit', 'navet-discord'] });
    const reddit = validDraft('navet-subreddit');
    const discord = { ...reddit, channelId: 'navet-discord' };
    const result = validateDrafts([reddit, discord], brief, loadChannelConfig());
    expect(result.errors.some((error) => error.includes('are too similar'))).toBe(true);
    expect(jaccardSimilarity(reddit.body, discord.body)).toBe(1);
  });

  it('rejects unsafe privacy claims, missing output fields, and unknown evidence', () => {
    const brief = makeBrief();
    const draft = {
      ...validDraft(),
      title: '',
      body: 'Navet is 100% private and never sends any data anywhere.',
      evidenceIds: ['invented-evidence'],
      assetAltText: '',
    };
    const result = validateDrafts([draft], brief, loadChannelConfig());
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Navet subreddit draft is missing a title.',
        'Navet subreddit draft is missing alt text.',
        'Navet subreddit draft contains an unsafe privacy claim.',
        'Navet subreddit draft cites unknown evidence "invented-evidence".',
      ])
    );
  });

  it('enforces the configured channel character limit', () => {
    const config = loadChannelConfig();
    const draft = { ...validDraft(), body: 'x'.repeat(12001) };
    expect(validateDrafts([draft], makeBrief(), config).errors).toContain(
      'Navet subreddit draft exceeds 12000 characters.'
    );
  });
});

describe('content pack generation', () => {
  it('writes an inspectable non-publishable fallback when credentials are missing', async () => {
    const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'navet-content-test-'));
    temporaryDirectories.push(outputRoot);
    const result = await generateContentPack({
      briefPath: 'marketing/content/briefs/2026-09-01-assist-0.15.4.yml',
      outputPath: outputRoot,
      env: {},
      now: fixedNow,
    });

    expect(result.pack.publishEligible).toBe(false);
    expect(result.pack.generator.mode).toBe('fallback');
    expect(fs.existsSync(path.join(outputRoot, 'review.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputRoot, 'channels', 'youtube.md'))).toBe(true);
  });

  it('accepts strict structured generation but still requires human review', async () => {
    const cacheTestRoot = path.join(repoRoot, '.cache', 'content-workflow-tests');
    fs.mkdirSync(cacheTestRoot, { recursive: true });
    const outputRoot = fs.mkdtempSync(path.join(cacheTestRoot, 'navet-content-ai-test-'));
    temporaryDirectories.push(outputRoot);
    const briefPath = path.join(outputRoot, 'brief.yml');
    const source = fs.readFileSync(
      path.resolve('marketing/content/briefs/2026-09-01-assist-0.15.4.yml'),
      'utf8'
    );
    const completeSource = source.replace(
      'PENDING: Add why bringing Assist into the everyday dashboard mattered to you personally.',
      'I wanted the same dashboard people already use to be the place they can ask for help.'
    ).replace('assist-focused-capture-needed', 'navet-ipad-landscape-home');
    fs.writeFileSync(briefPath, completeSource);

    const generatedDraft = {
      channelId: 'navet-subreddit',
      title: 'Use Home Assistant Assist from Navet',
      body: 'Navet now opens Home Assistant Assist beside the dashboard. Choose a pipeline, type or speak, and keep the current Home Assistant-only boundary clear.',
      script: '',
      description: 'A complete Navet community update.',
      evidenceIds: ['release-assist', 'capability-assist'],
      cta: {
        label: 'Read the Home Assistant installation guide',
        url: 'https://docs.navet.app/install/home-assistant/',
      },
      assetAltText: 'Navet Assist open over the dashboard with text and microphone input.',
    };
    const discordDraft = {
      ...generatedDraft,
      channelId: 'navet-discord',
      title: 'Assist is now inside Navet',
      body: 'Text, microphone, and pipeline choice now sit inside Navet for Home Assistant. I would like to know which wall-panel request should feel fastest.',
      description: 'A compact Discord conversation starter.',
    };
    const youtubeDraft = {
      ...generatedDraft,
      channelId: 'youtube',
      title: 'Home Assistant Assist in Navet',
      body: 'A narrated demonstration of the current Home Assistant Assist flow.',
      script: 'Show the result first. Open Assist, choose a pipeline, use the microphone, and explain that Homey and openHAB do not register this capability yet.',
      description: 'A two-minute narrated product walkthrough.',
    };
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({ drafts: [generatedDraft, discordDraft, youtubeDraft] }),
      }),
    });

    const result = await generateContentPack({
      briefPath,
      outputPath: outputRoot,
      env: { OPENAI_API_KEY: 'test-key', NAVET_CONTENT_MODEL: 'test-model' },
      fetchImpl,
      now: fixedNow,
    });
    expect(result.pack.generator.mode).toBe('ai-structured');
    expect(result.pack.requiresHumanReview).toBe(true);
    expect(result.pack.publishEligible).toBe(true);
    expect(checkContentPack(result.pack, { now: fixedNow }).errors).toEqual([]);
  });
});

describe('publication recording guardrails', () => {
  it('requires valid final copy and external affiliation disclosure', () => {
    const brief = makeBrief({
      providerScope: ['home-assistant'],
      channels: ['homeassistant-reddit'],
    });
    const channels = loadChannelConfig();
    const selectedChannels = validateBrief(brief, channels, { now: fixedNow }).selectedChannels;
    const pack = { brief, drafts: createFallbackDrafts(brief, selectedChannels) };
    const result = validateFinalCopy({
      body: 'A useful Home Assistant-specific explanation without an affiliation statement.',
      channelId: 'homeassistant-reddit',
      pack,
      publicUrl: 'https://www.reddit.com/r/homeassistant/comments/example',
    });
    expect(result.errors).toContain(
      'Home Assistant subreddit draft is missing the required affiliation disclosure.'
    );
  });

  it('uses only human-reviewed manual publications as future voice examples', () => {
    const publishedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'navet-published-test-'));
    temporaryDirectories.push(publishedRoot);
    const contentDirectory = path.join(publishedRoot, 'content-id');
    fs.mkdirSync(contentDirectory);
    fs.writeFileSync(
      path.join(contentDirectory, 'approved.json'),
      JSON.stringify({
        channelId: 'navet-subreddit',
        publishedAt: '2026-09-01T12:00:00.000Z',
        publicUrl: 'https://www.reddit.com/r/navet/comments/example',
        finalCopy: 'This is the maintainer-edited public post.',
        humanReviewed: true,
        publishedManually: true,
      })
    );
    fs.writeFileSync(
      path.join(contentDirectory, 'generated.json'),
      JSON.stringify({
        channelId: 'navet-subreddit',
        publishedAt: '2026-09-02T12:00:00.000Z',
        finalCopy: 'This generated draft must not become a voice example.',
        humanReviewed: false,
        publishedManually: false,
      })
    );

    expect(loadPublishedVoiceExamples(['navet-subreddit'], 3, publishedRoot)).toEqual([
      {
        channelId: 'navet-subreddit',
        publishedAt: '2026-09-01T12:00:00.000Z',
        publicUrl: 'https://www.reddit.com/r/navet/comments/example',
        finalCopy: 'This is the maintainer-edited public post.',
      },
    ]);
  });

  it('keeps missing metrics distinct from zero and rejects invented text values', () => {
    expect(
      validateMetrics({
        after24Hours: { linkClicks: null, explicitInstallReports: 0 },
        after7Days: null,
        notes: ['No install reports were inferred from visits.'],
      })
    ).toEqual([]);
    expect(
      validateMetrics({
        after24Hours: { explicitInstallReports: 'probably 10' },
        after7Days: null,
        notes: [],
      })
    ).toContain('after24Hours.explicitInstallReports must be a non-negative number or null.');
  });
});
