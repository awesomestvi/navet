import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseCachedReleases,
  parseReleaseGroups,
  releaseKind,
} from '../../../../../apps/docs/src/utils/release-feed';
import { loadReleaseCache, saveReleaseCache } from '../../utils/public-release-cache';
import { parseLatestGithubRelease } from './github-release';

describe('public release feed resilience', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it('renders an internal-only release instead of reverting its version', () => {
    const body = 'No user-facing changes in this release.';
    expect(
      parseLatestGithubRelease({
        tag_name: 'v0.18.0',
        html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.18.0',
        body,
      }).version
    ).toBe('0.18.0');
    expect(parseReleaseGroups(body)[0].items).toEqual([body]);
    expect(parseReleaseGroups('')[0].items).toEqual(['No release notes were provided.']);
  });
  it('makes combined generated headings match both Improved and Fixed', () => {
    expect(releaseKind('Improvements and bug fixes').split(' ')).toEqual(['improved', 'fixed']);
    expect(parseReleaseGroups('## Improvements and bug fixes\n\n- Fixed badge.')[0].kind).toBe(
      'improved fixed'
    );
  });
  it('ignores malformed caches and unsafe release links', () => {
    localStorage.setItem('navet-release-feed:v1:docs', '{');
    expect(loadReleaseCache('docs', parseCachedReleases)).toBeNull();
    saveReleaseCache(
      'docs',
      [{ version: '0.18.0', date: '2026-01-01', url: 'javascript:alert(1)', body: 'notes' }],
      '2026-01-01T00:00:00Z'
    );
    expect(loadReleaseCache('docs', parseCachedReleases)).toBeNull();
  });
  it('tolerates denied browser storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadReleaseCache('docs', parseCachedReleases)).toBeNull();
    expect(() => saveReleaseCache('docs', [], '2026-01-01T00:00:00Z')).not.toThrow();
  });
});
