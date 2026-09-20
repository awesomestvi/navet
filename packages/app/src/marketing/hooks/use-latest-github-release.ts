import { MARKETING_LATEST_RELEASE } from '@navet/app/marketing/constants/marketingReleaseHighlights';
import { parseLatestGithubRelease } from '@navet/app/marketing/utils/github-release';
import { useEffect, useState } from 'react';

const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/awesomestvi/navet/releases/latest';

let latestReleasePromise: Promise<typeof MARKETING_LATEST_RELEASE> | undefined;

function loadLatestRelease() {
  latestReleasePromise ??= fetch(LATEST_RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);
      return response.json();
    })
    .then(parseLatestGithubRelease)
    .catch((error) => {
      latestReleasePromise = undefined;
      throw error;
    });

  return latestReleasePromise;
}

export function useLatestGithubRelease() {
  const [release, setRelease] = useState(MARKETING_LATEST_RELEASE);

  useEffect(() => {
    let active = true;
    loadLatestRelease()
      .then((latestRelease) => {
        if (active) setRelease(latestRelease);
      })
      .catch(() => {
        // Keep the build-time release fallback when GitHub is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  return release;
}
