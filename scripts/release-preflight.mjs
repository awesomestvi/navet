import { execFileSync } from 'node:child_process';
import { compareVersions } from './release-channels.mjs';

const target = process.env.RELEASE_TAG;
if (!/^v\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(target ?? ''))
  throw new Error('Invalid release target.');
const prerelease = target.includes('-');
// Publication is serialized; reject stale recovery runs before any HACS/App metadata writes.
for (const repo of [process.env.GITHUB_REPOSITORY, 'awesomestvi/navet-home-assistant']) {
  const pages = JSON.parse(
    execFileSync('gh', ['api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`], {
      encoding: 'utf8',
    }),
  );
  for (const release of pages.flat()) {
    const tag = release.tag_name;
    if (release.draft || !/^v\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(tag)) continue;
    // Stable must not be blocked by an unrelated future beta, but beta must not regress stable.
    if (!prerelease && release.prerelease) continue;
    if (compareVersions(tag.slice(1), target.slice(1)) > 0)
      throw new Error(`Refusing stale publication ${target}: ${repo} already publishes ${tag}.`);
  }
}
