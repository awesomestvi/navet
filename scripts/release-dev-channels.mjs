import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { inspectImage } from './release-image.mjs';

const sha = process.env.RELEASE_SHA;
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('An exact release commit is required.');
const updates = [];
for (const name of ['navet', 'amd64-navet-addon', 'aarch64-navet-addon']) {
  const record = JSON.parse(readFileSync(`release-images/${name}.json`, 'utf8'));
  if (
    record.image !== `ghcr.io/${process.env.GITHUB_REPOSITORY_OWNER}/${name}` ||
    record.sha !== sha ||
    record.channel !== 'dev'
  )
    throw new Error('Invalid Dev image identity.');
  if (inspectImage(`${record.image}:${record.tag}`) !== record.digest)
    throw new Error('Dev image changed after testing.');
  for (const alias of ['dev', 'edge']) {
    const reference = `${record.image}:${alias}`;
    const previous = inspectImage(reference, { optional: true });
    if (previous && previous !== record.digest) {
      const config = JSON.parse(
        execFileSync(
          'docker',
          [
            'buildx',
            'imagetools',
            'inspect',
            `${record.image}@${previous}`,
            '--format',
            '{{json .Image}}',
          ],
          { encoding: 'utf8' },
        ),
      );
      const revisions = [];
      const visit = (value) => {
        if (!value || typeof value !== 'object') return;
        let revision = value.Labels?.['org.opencontainers.image.revision'];
        const legacyVersion = value.Labels?.['io.hass.version'];
        if (!revision && /^\d+\.\d+\.\d+-dev\.\d{14}$/.test(legacyVersion ?? '')) {
          revision = execFileSync(
            'git',
            ['rev-parse', '--verify', `refs/tags/navet-dev-${legacyVersion}^{commit}`],
            { encoding: 'utf8' },
          ).trim();
        }
        if (revision) revisions.push(revision);
        else Object.values(value).forEach(visit);
      };
      visit(config);
      // Legacy add-on versions resolve through their immutable annotated Dev tag.
      if (
        !revisions.length ||
        revisions.some(
          (revision) =>
            !/^[a-f0-9]{40}$/.test(revision) ||
            spawnSync('git', ['merge-base', '--is-ancestor', revision, sha]).status !== 0,
        )
      ) {
        throw new Error(`Cannot prove forward-only update of ${reference}.`);
      }
    }
    updates.push({ reference, source: `${record.image}@${record.digest}`, digest: record.digest });
  }
}
for (const { reference, source, digest } of updates) {
  execFileSync(
    'docker',
    ['buildx', 'imagetools', 'create', '--prefer-index=false', '--tag', reference, source],
    { stdio: 'inherit' },
  );
  if (inspectImage(reference) !== digest) throw new Error('Dev channel digest mismatch.');
}
