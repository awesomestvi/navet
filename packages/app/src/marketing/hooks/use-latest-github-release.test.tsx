import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('useLatestGithubRelease', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

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
    const { useLatestGithubRelease } = await import('./use-latest-github-release');

    const { result } = renderHook(() => useLatestGithubRelease());

    await waitFor(() => expect(result.current.version).toBe('0.17.2'));
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/awesomestvi/navet/releases/latest',
      { headers: { Accept: 'application/vnd.github+json' } }
    );
  });

  it('retries on a later mount after GitHub is temporarily unavailable', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('GitHub unavailable'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tag_name: 'v0.17.2',
            html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.17.2',
            body: '## Improvements and bug fixes\n\n- Fixed the Home security summary badge.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    const { useLatestGithubRelease } = await import('./use-latest-github-release');

    const first = renderHook(() => useLatestGithubRelease());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    first.unmount();

    const second = renderHook(() => useLatestGithubRelease());
    await waitFor(() => expect(second.result.current.version).toBe('0.17.2'));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
