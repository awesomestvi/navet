import { describe, expect, it } from 'vitest';
import {
  collectPromotionSources,
  parsePromotionTag,
  resolvePromotion,
} from './release-promotion.mjs';

const dev = 'navet-dev-0.17.1-dev.20260920120000';
const olderDev = 'navet-dev-0.17.1-dev.20260919120000';
const sha = 'a'.repeat(40);
const source = (tag) => ({ tag, sha });
const plan = (options = {}) =>
  resolvePromotion({
    tags: ['v0.17.1'],
    sources: [source(dev)],
    ...options,
  });

describe('promotion defaults', () => {
  it('selects newest eligible Dev by timestamp and advances beyond reserved beta tags', () => {
    expect(
      plan({
        sources: [source(dev), source(olderDev)],
        tags: ['v0.17.1', 'v0.17.2-beta.1', 'v0.17.2-beta.3'],
      }),
    ).toEqual({ source_tag: dev, release_tag: 'v0.17.2-beta.4', source_sha: sha });
  });
  it('uses newer Dev base versions and supports the first release', () => {
    expect(plan({ sources: [source('navet-dev-0.18.0-dev.20260920120000')] }).release_tag).toBe(
      'v0.18.0-beta.1',
    );
    expect(plan({ tags: [] }).release_tag).toBe('v0.17.1-beta.1');
  });
  it('supports exact source and target overrides', () => {
    expect(
      plan({
        sourceTag: olderDev,
        releaseTag: 'v0.18.0-beta.1',
        sources: [source(dev), source(olderDev)],
      }),
    ).toMatchObject({ source_tag: olderDev, release_tag: 'v0.18.0-beta.1' });
  });
  it('advances RC for the highest candidate, falling back to Dev only without candidates', () => {
    expect(
      plan({
        channel: 'rc',
        sources: [source(dev), source('v0.17.2-beta.4')],
        tags: ['v0.17.1', 'v0.17.2-rc.2'],
      }).release_tag,
    ).toBe('v0.17.2-rc.3');
    expect(plan({ channel: 'rc' }).release_tag).toBe('v0.17.2-rc.1');
  });
  it.each(['beta', 'rc'])('rejects a %s override below a reserved number', (channel) => {
    const tags = ['v0.17.1', `v0.17.2-${channel}.5`];
    expect(() => plan({ channel, tags, releaseTag: `v0.17.2-${channel}.3` })).toThrow(
      'number must advance',
    );
    expect(plan({ channel, tags, releaseTag: `v0.17.2-${channel}.6` }).release_tag).toBe(
      `v0.17.2-${channel}.6`,
    );
  });
  it('checks RC overrides against all tags, not just the selected source', () => {
    expect(() =>
      plan({
        channel: 'rc',
        sourceTag: 'v0.17.2-rc.1',
        sources: [source('v0.17.2-rc.1')],
        tags: ['v0.17.2-rc.5'],
        releaseTag: 'v0.17.2-rc.3',
      }),
    ).toThrow('RC number must advance');
  });
  it('keeps numbering scoped to the target version and channel', () => {
    expect(
      plan({ tags: ['v0.17.1', 'v0.17.2-rc.9', 'v0.18.0-beta.9'], releaseTag: 'v0.17.2-beta.1' })
        .release_tag,
    ).toBe('v0.17.2-beta.1');
    expect(
      plan({
        channel: 'stable',
        sources: [source('v0.17.2-rc.9')],
        tags: ['v0.17.1', 'v0.17.2-rc.9'],
      }).release_tag,
    ).toBe('v0.17.2');
  });
  it('prefers RC to beta for stable and never selects already stable versions', () => {
    expect(
      plan({
        channel: 'stable',
        sources: [
          source(dev),
          source('v0.17.1-rc.9'),
          source('v0.17.2-beta.10'),
          source('v0.17.2-rc.2'),
        ],
      }),
    ).toEqual({ source_tag: 'v0.17.2-rc.2', release_tag: 'v0.17.2', source_sha: sha });
    expect(() => plan({ channel: 'stable', sources: [source('v0.17.1-rc.9')] })).toThrow(
      'No successfully published source',
    );
  });
  it('matches automatic source to an explicit target base', () => {
    expect(
      plan({
        channel: 'stable',
        releaseTag: 'v0.17.2',
        sources: [source('v0.18.0-beta.1'), source('v0.17.2-beta.2')],
      }).source_tag,
    ).toBe('v0.17.2-beta.2');
  });
  it.each([
    [{ sources: [] }, 'No successfully published source'],
    [{ sourceTag: olderDev }, 'not a successfully published'],
    [{ channel: 'stable' }, 'No successfully published source'],
    [{ channel: 'stable', sourceTag: dev }, 'Stable must promote'],
    [{ sourceTag: 'v0.17.2-beta.1', sources: [source('v0.17.2-beta.1')] }, 'Beta must promote'],
    [{ releaseTag: 'v0.18.0' }, 'match the selected channel'],
    [{ releaseTag: 'v0.17.1-beta.1' }, 'newer than the latest stable'],
    [{ releaseTag: 'v0.17.2-beta.1', tags: ['v0.17.2-beta.1'] }, 'already exists'],
    [
      {
        channel: 'stable',
        sourceTag: 'v0.17.2-beta.1',
        releaseTag: 'v0.18.0',
        sources: [source('v0.17.2-beta.1')],
      },
      'same base version',
    ],
    [
      {
        channel: 'rc',
        sourceTag: 'v0.17.2-rc.2',
        releaseTag: 'v0.17.2-rc.1',
        sources: [source('v0.17.2-rc.2')],
      },
      'RC number must advance',
    ],
    [{ channel: 'other' }, 'Choose beta'],
  ])('rejects unsafe or unavailable selection %j', (options, message) => {
    expect(() => plan(options)).toThrow(message);
  });
  it.each([
    'v01.2.3',
    'v1.2.3-beta.0',
    'v1.2.3-beta.99999999999999999',
    'v1.2.3\ninjected=true',
    '../main',
    'v1.2.3-rc.1; echo unsafe',
  ])('rejects malformed tag %s', (tag) => {
    expect(parsePromotionTag(tag)).toBeNull();
  });
});

describe('published source discovery', () => {
  const release = (tag, extra = {}) => ({
    tag_name: tag,
    draft: false,
    prerelease: true,
    ...extra,
  });
  it('excludes drafts, stable, unverified commits, and failed publications', async () => {
    const sources = await collectPromotionSources({
      releases: [
        release(dev),
        release(olderDev),
        release('v0.17.2-beta.1'),
        release('v0.17.2-rc.1'),
        release('v0.17.2'),
        release('invalid'),
        release(dev, { draft: true }),
        release(dev, { prerelease: false }),
        release('navet-dev-0.17.1-dev.20260918120000'),
      ],
      inspectTag: ({ tag }) => (tag.includes('20260918') ? null : sha),
      devSucceeded: (tag) => tag === dev,
      candidateSucceeded: (r) => r.tag_name === 'v0.17.2-rc.1',
    });
    expect(sources).toEqual([source(dev), source('v0.17.2-rc.1')]);
  });
  it('fails closed on API errors instead of silently selecting an older build', async () => {
    await expect(
      collectPromotionSources({
        releases: [release(dev)],
        inspectTag: () => sha,
        devSucceeded: () => {
          throw new Error('API unavailable');
        },
      }),
    ).rejects.toThrow('API unavailable');
  });
});
