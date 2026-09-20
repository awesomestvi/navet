import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { inspectImage } from './release-image.mjs';
import { validateEvidence } from './release-evidence.mjs';

export function compareVersions(a, b) {
  const parse = (version) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-(beta|rc)\.(\d+))?$/.exec(version);
    if (!match) throw new Error(`Cannot safely compare channel version ${version}.`);
    return [
      ...match.slice(1, 4).map(Number),
      { beta: 0, rc: 1 }[match[4]] ?? 2,
      Number(match[5] ?? 0),
    ];
  };
  const left = parse(a),
    right = parse(b);
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index]) return Math.sign(left[index] - right[index]);
  return 0;
}

/** Collect Navet versions from an inspected image, preferring the add-on's own version label. */
export function imageVersions(value) {
  if (!value || typeof value !== 'object') return [];
  const version =
    value.Labels?.['io.hass.version'] ?? value.Labels?.['org.opencontainers.image.version'];
  return version ? [version] : Object.values(value).flatMap(imageVersions);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const evidence = JSON.parse(readFileSync('navet-release-evidence.json', 'utf8'));
  validateEvidence(evidence, {
    tag: process.env.RELEASE_TAG,
    sha: process.env.RELEASE_SHA,
    owner: process.env.GITHUB_REPOSITORY_OWNER,
  });
  if (evidence.runId !== Number(process.env.GITHUB_RUN_ID))
    throw new Error('This run did not verify the recorded artifacts.');
  const updates = [];
  // Preflight every alias before writing any of them. A stale retry cannot roll a channel back.
  for (const image of evidence.images) {
    if (inspectImage(`${image.image}:${image.tag}`) !== image.digest)
      throw new Error('Candidate changed after runtime verification.');
    const aliases =
      evidence.channel === 'stable'
        ? [
            'latest',
            ...(image.image.endsWith('/navet')
              ? [evidence.version.split('.').slice(0, 2).join('.')]
              : []),
          ]
        : ['beta'];
    for (const alias of aliases) {
      const reference = `${image.image}:${alias}`;
      const previous = inspectImage(reference, { optional: true });
      if (previous && previous !== image.digest) {
        const config = JSON.parse(
          execFileSync(
            'docker',
            [
              'buildx',
              'imagetools',
              'inspect',
              `${image.image}@${previous}`,
              '--format',
              '{{json .Image}}',
            ],
            { encoding: 'utf8' },
          ),
        );
        const versions = imageVersions(config);
        if (
          !versions.length ||
          versions.some((version) => compareVersions(version, evidence.version) >= 0)
        ) {
          throw new Error(`Refusing to replace equal/newer or unidentified channel ${reference}.`);
        }
      }
      updates.push({ reference, source: `${image.image}@${image.digest}`, digest: image.digest });
    }
  }
  for (const { reference, source, digest } of updates) {
    execFileSync(
      'docker',
      ['buildx', 'imagetools', 'create', '--prefer-index=false', '--tag', reference, source],
      { stdio: 'inherit' },
    );
    if (inspectImage(reference) !== digest)
      throw new Error(`Channel digest mismatch: ${reference}`);
  }
}
