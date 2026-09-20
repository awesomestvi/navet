import { MARKETING_LATEST_RELEASE } from '@navet/app/marketing/constants/marketingReleaseHighlights';
import { parseLatestGithubRelease } from '@navet/app/marketing/utils/github-release';
import { useEffect, useState } from 'react';
import { loadReleaseCache, saveReleaseCache } from '../../utils/public-release-cache';

const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/awesomestvi/navet/releases/latest';

let latestReleasePromise: Promise<typeof MARKETING_LATEST_RELEASE> | undefined;
let checkedAt = '';

function loadLatestRelease() {
  if (checkedAt && Date.now() - Date.parse(checkedAt) > 300_000) latestReleasePromise = undefined;
  latestReleasePromise ??= fetch(LATEST_RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(10_000),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);
      return response.json();
    })
    .then((value) => {
      const release = parseLatestGithubRelease(value);
      checkedAt = new Date().toISOString();
      saveReleaseCache(
        'latest',
        { tag_name: `v${release.version}`, html_url: release.url, body: value.body },
        checkedAt
      );
      return release;
    })
    .catch((error) => {
      latestReleasePromise = undefined;
      throw error;
    });

  return latestReleasePromise;
}

export function useLatestGithubRelease() {
  const [release, setRelease] = useState(MARKETING_LATEST_RELEASE);
  const [status, setStatus] = useState<'checking' | 'fresh' | 'stale'>('checking');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const cached = loadReleaseCache('latest', parseLatestGithubRelease);
    if (cached) {
      setRelease(cached.value);
      setLastChecked(cached.checkedAt);
    }
    loadLatestRelease()
      .then((latestRelease) => {
        if (active) {
          setRelease(latestRelease);
          setStatus('fresh');
          setLastChecked(checkedAt);
        }
      })
      .catch(() => {
        if (active) setStatus('stale');
      });

    return () => {
      active = false;
    };
  }, []);

  return { ...release, status, lastChecked };
}
