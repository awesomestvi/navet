import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLatestGithubRelease } from './use-latest-github-release';

describe('useLatestGithubRelease', () => {
  it('loads the canonical latest stable GitHub release', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          tag_name: 'v0.17.2',
          html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.17.2',
          body: '## Improvements and bug fixes\n\n- Fixed the Home security summary badge.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(() => useLatestGithubRelease());

    await waitFor(() => expect(result.current.version).toBe('0.17.2'));
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/awesomestvi/navet/releases/latest',
      { headers: { Accept: 'application/vnd.github+json' } }
    );
  });
});
