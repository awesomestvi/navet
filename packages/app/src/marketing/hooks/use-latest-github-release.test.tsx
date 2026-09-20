import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('useLatestGithubRelease', () => {
  afterEach(() => {
    localStorage.clear();
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
      expect.objectContaining({
        headers: { Accept: 'application/vnd.github+json' },
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('keeps saved notes across reloads and labels them stale during an outage', async () => {
    localStorage.setItem(
      'navet-release-feed:v1:latest',
      JSON.stringify({
        checkedAt: '2026-01-01T00:00:00Z',
        value: {
          tag_name: 'v0.18.0',
          html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.18.0',
          body: 'No user-facing changes in this release.',
        },
      })
    );
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const { useLatestGithubRelease } = await import('./use-latest-github-release');
    const { result } = renderHook(() => useLatestGithubRelease());
    await waitFor(() => expect(result.current.status).toBe('stale'));
    expect(result.current.version).toBe('0.18.0');
    expect(result.current.lastChecked).toBe('2026-01-01T00:00:00Z');
  });

  it('deduplicates concurrent consumers and persists a validated response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          tag_name: 'v0.18.1',
          html_url: 'https://github.com/awesomestvi/navet/releases/tag/v0.18.1',
          body: 'No user-facing changes in this release.',
        })
      )
    );
    const { useLatestGithubRelease } = await import('./use-latest-github-release');
    const first = renderHook(() => useLatestGithubRelease());
    const second = renderHook(() => useLatestGithubRelease());
    await waitFor(() => expect(first.result.current.status).toBe('fresh'));
    await waitFor(() => expect(second.result.current.status).toBe('fresh'));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('navet-release-feed:v1:latest')).toContain('v0.18.1');
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
