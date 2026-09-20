import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { pagesProjects, pagesAffected } from './pages-policy.mjs';

export function requiredPagesChecks(impact) {
  return Object.entries(pagesProjects)
    .filter(([surface]) => impact[surface] === 'true')
    .map(([, project]) => `Cloudflare Pages: ${project.name}`);
}

export function pagesCheckState(checks, names, sha) {
  return names.map((name) => {
    const check = checks
      .filter((entry) => entry.name === name && entry.head_sha === sha && entry.app?.id === 85455)
      .sort((a, b) => b.id - a.id)[0];
    if (!check || check.status !== 'completed') return 'pending';
    return check.conclusion === 'success' ? 'success' : 'failure';
  });
}

export function equivalentPagesInputs(surface, changedFiles) {
  // Unlike an empty push, an empty tree diff proves identical inputs.
  return changedFiles.length === 0 || !pagesAffected(changedFiles)[surface];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.env.HEAD_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? ''))
    throw new Error('Pages checks require the exact PR head SHA.');
  const names = requiredPagesChecks(JSON.parse(process.env.IMPACT_JSON));
  const refs = execFileSync('git', ['rev-list', '--first-parent', '--max-count=100', sha], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n');
  const candidates = Object.fromEntries(
    names.map((name) => {
      const surface = Object.entries(pagesProjects).find(
        ([, project]) => `Cloudflare Pages: ${project.name}` === name,
      )[0];
      const matching = [sha];
      for (const ref of refs.slice(1)) {
        const files = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', ref, sha], {
          encoding: 'utf8',
        })
          .split('\0')
          .filter(Boolean);
        if (!equivalentPagesInputs(surface, files)) break;
        matching.push(ref);
      }
      return [name, matching];
    }),
  );
  const deadline = Date.now() + 20 * 60 * 1000;
  while (names.length) {
    const byRef = new Map();
    const states = names.map((name) => {
      for (const ref of candidates[name]) {
        if (!byRef.has(ref)) {
          const pages = JSON.parse(
            execFileSync(
              'gh',
              [
                'api',
                '--paginate',
                '--slurp',
                `repos/${process.env.GITHUB_REPOSITORY}/commits/${ref}/check-runs?per_page=100`,
              ],
              { encoding: 'utf8' },
            ),
          );
          byRef.set(
            ref,
            pages.flatMap((page) => page.check_runs),
          );
        }
        const checks = byRef.get(ref);
        if (
          checks.some(
            (check) => check.name === name && check.head_sha === ref && check.app?.id === 85455,
          )
        ) {
          // A current pending/failed attempt may not be bypassed with an older success.
          return pagesCheckState(checks, [name], ref)[0];
        }
      }
      return 'pending';
    });
    if (states.includes('failure')) throw new Error('An affected Cloudflare preview failed.');
    if (states.every((state) => state === 'success')) break;
    if (Date.now() >= deadline)
      throw new Error('Timed out waiting for affected Cloudflare previews.');
    await delay(15000);
  }
  console.log(`Verified ${names.length} affected Pages previews.`);
}
