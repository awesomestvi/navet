import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { digestPattern, inspectImage } from './release-image.mjs';

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const fileDigest = (file) =>
  `sha256:${createHash('sha256').update(readFileSync(file)).digest('hex')}`;

export function validateEvidence(evidence, { tag, sha, owner }) {
  if (
    evidence?.schema !== 1 ||
    evidence.tag !== tag ||
    evidence.sha !== sha ||
    !/^v\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(tag) ||
    evidence.version !== tag.replace(/^v/, '') ||
    !Number.isSafeInteger(evidence.runId) ||
    evidence.runId <= 0 ||
    !digestPattern.test(evidence.panelDigest) ||
    evidence.channel !== (tag.includes('-') ? 'beta' : 'stable')
  ) {
    throw new Error('Source release evidence does not match the selected tag and commit.');
  }
  const names = ['navet', 'amd64-navet-addon', 'aarch64-navet-addon'];
  if (!Array.isArray(evidence.images) || evidence.images.length !== names.length)
    throw new Error('Incomplete release evidence.');
  for (const name of names) {
    const image = evidence.images.find((entry) => entry.image === `ghcr.io/${owner}/${name}`);
    if (
      !image ||
      !digestPattern.test(image.digest) ||
      image.sha !== sha ||
      image.version !== evidence.version ||
      image.channel !== evidence.channel ||
      image.tag !== (name === 'navet' ? tag : evidence.version)
    ) {
      throw new Error(`Invalid release evidence for ${name}.`);
    }
  }
}

export function assertSameArtifactIdentity(previous, next) {
  const identity = (evidence) =>
    JSON.stringify({
      tag: evidence.tag,
      sha: evidence.sha,
      version: evidence.version,
      channel: evidence.channel,
      panelDigest: evidence.panelDigest,
      images: evidence.images
        .map(({ image, tag, digest, version, sha, channel }) => ({
          image,
          tag,
          digest,
          version,
          sha,
          channel,
        }))
        .sort((a, b) => a.image.localeCompare(b.image)),
    });
  if (identity(previous) !== identity(next))
    throw new Error('Recovery would change published artifact identities. Create a new version.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {
    GITHUB_REPOSITORY: repo,
    GITHUB_REPOSITORY_OWNER: owner,
    SOURCE_TAG: tag,
    RELEASE_SHA: sha,
  } = process.env;
  if (process.argv[2] === 'verify-source') {
    if (tag.startsWith('navet-dev-')) {
      const runs = JSON.parse(
        gh(
          'api',
          `repos/${repo}/actions/workflows/dev-tag-release.yml/runs?head_sha=${sha}&status=success&per_page=100`,
        ),
      ).workflow_runs;
      if (
        !runs.some(
          (run) => run.head_branch === tag && run.head_sha === sha && run.conclusion === 'success',
        )
      ) {
        throw new Error('The selected Dev tag has no successful publication run.');
      }
    } else {
      const directory = mkdtempSync(join(tmpdir(), 'navet-release-evidence-'));
      gh(
        'release',
        'download',
        tag,
        '--repo',
        repo,
        '--pattern',
        'navet-release-evidence.json',
        '--dir',
        directory,
      );
      const evidence = JSON.parse(
        readFileSync(join(directory, 'navet-release-evidence.json'), 'utf8'),
      );
      validateEvidence(evidence, { tag, sha, owner });
      const run = JSON.parse(gh('api', `repos/${repo}/actions/runs/${evidence.runId}`));
      if (run.conclusion !== 'success' || run.path !== '.github/workflows/release.yml')
        throw new Error('Source release publication is not complete.');
      for (const image of evidence.images) {
        if (inspectImage(`${image.image}:${image.tag}`) !== image.digest)
          throw new Error('Source image changed after verification.');
      }
      const panel = `navet-panel-${tag}.tar.gz`;
      gh('release', 'download', tag, '--repo', repo, '--pattern', panel, '--dir', directory);
      if (fileDigest(join(directory, panel)) !== evidence.panelDigest)
        throw new Error('Source panel changed after verification.');
    }
  } else if (process.argv[2] === 'write') {
    const evidence = {
      schema: 1,
      tag: process.env.RELEASE_TAG,
      sha,
      version: process.env.VERSION,
      channel: process.env.RELEASE_CHANNEL,
      runId: Number(process.env.GITHUB_RUN_ID),
      panelDigest: fileDigest(`release-assets/navet-panel-${process.env.RELEASE_TAG}.tar.gz`),
      images: readdirSync('release-images')
        .filter((file) => file.endsWith('.json'))
        .sort()
        .map((file) => JSON.parse(readFileSync(join('release-images', file), 'utf8'))),
    };
    validateEvidence(evidence, { tag: evidence.tag, sha, owner });
    writeFileSync('navet-release-evidence.json', JSON.stringify(evidence, null, 2));
  } else if (process.argv[2] === 'publish') {
    const next = JSON.parse(readFileSync('navet-release-evidence.json', 'utf8'));
    validateEvidence(next, { tag: process.env.RELEASE_TAG, sha, owner });
    const release = JSON.parse(gh('api', `repos/${repo}/releases/tags/${next.tag}`));
    const exists = release.assets.some((asset) => asset.name === 'navet-release-evidence.json');
    if (exists) {
      const directory = mkdtempSync(join(tmpdir(), 'navet-release-recovery-'));
      gh(
        'release',
        'download',
        next.tag,
        '--repo',
        repo,
        '--pattern',
        'navet-release-evidence.json',
        '--dir',
        directory,
      );
      const previous = JSON.parse(
        readFileSync(join(directory, 'navet-release-evidence.json'), 'utf8'),
      );
      validateEvidence(previous, { tag: next.tag, sha, owner });
      assertSameArtifactIdentity(previous, next);
    }
    // Only the verifying run may change; the package identities above are immutable.
    gh(
      'release',
      'upload',
      next.tag,
      'navet-release-evidence.json',
      '--repo',
      repo,
      ...(exists ? ['--clobber'] : []),
    );
  } else throw new Error('Expected verify-source, write or publish.');
}
