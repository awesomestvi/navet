import { describe, expect, it } from 'vitest';
import { parseLatestGithubRelease } from './github-release';

describe('GitHub release parser', () => {
  it('turns the canonical latest release into marketing content', () => {
    expect(
      parseLatestGithubRelease({
        tag_name: 'v0.17.2',
        html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.17.2',
        body: '## Improvements and bug fixes\n\n- Fixed the Home security summary badge.',
      })
    ).toEqual({
      version: '0.17.2',
      url: 'https://github.com/awesomestvi/navet/releases/tag/v0.17.2',
      highlights: [{ type: 'Fixed', description: 'Fixed the Home security summary badge.' }],
    });
  });

  it('rejects prereleases and incomplete release records', () => {
    expect(() =>
      parseLatestGithubRelease({
        tag_name: 'v0.17.2-beta.1',
        html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.17.2-beta.1',
        body: '- Beta notes.',
      })
    ).toThrow('stable Navet tag');
  });
});
