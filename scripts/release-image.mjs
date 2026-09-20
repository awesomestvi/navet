import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const digestPattern = /^sha256:[a-f0-9]{64}$/;
export function validateDescriptor(descriptor) {
  if (!digestPattern.test(descriptor?.digest))
    throw new Error('Registry returned no immutable digest.');
  return descriptor.digest;
}

export function inspectImage(reference, { optional = false, execute = spawnSync } = {}) {
  const result = execute(
    'docker',
    ['buildx', 'imagetools', 'inspect', reference, '--format', '{{json .Manifest}}'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    // Auth, rate limiting and network failures must never permit rebuilding an existing tag.
    const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const absent =
      /manifest unknown/i.test(result.stderr ?? '') ||
      new RegExp(`(?:^|\\n)(?:ERROR: )?${escapedReference}: not found(?:\\n|$)`).test(
        result.stderr ?? '',
      );
    if (
      optional &&
      absent &&
      !/unauthorized|denied|timeout|connection|429/i.test(result.stderr ?? '')
    )
      return null;
    throw new Error(result.stderr || result.error?.message || 'Registry lookup failed.');
  }
  return validateDescriptor(JSON.parse(result.stdout));
}

export function assertImageLabels(labels, { version, sha, channel }) {
  for (const [key, expected] of Object.entries({
    'org.opencontainers.image.version': version,
    'org.opencontainers.image.revision': sha,
    'io.navet.release-channel': channel,
  })) {
    if (labels?.[key] !== expected)
      throw new Error(`Image ${key} does not match ${expected}. Refusing to replace it.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { IMAGE, IMAGE_TAG, VERSION, RELEASE_SHA, RELEASE_CHANNEL } = process.env;
  if (
    !/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(IMAGE ?? '') ||
    !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/.test(IMAGE_TAG ?? '')
  )
    throw new Error('Invalid image reference.');
  const digest = inspectImage(`${IMAGE}:${IMAGE_TAG}`, { optional: process.argv[2] === 'lookup' });
  if (process.argv[2] === 'lookup') {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `exists=${Boolean(digest)}\ndigest=${digest ?? ''}\n`,
    );
  } else if (process.argv[2] === 'record') {
    mkdirSync('release-images', { recursive: true });
    writeFileSync(
      `release-images/${IMAGE.split('/').at(-1)}.json`,
      JSON.stringify(
        {
          image: IMAGE,
          tag: IMAGE_TAG,
          digest,
          version: VERSION,
          sha: RELEASE_SHA,
          channel: RELEASE_CHANNEL,
        },
        null,
        2,
      ),
    );
  } else {
    throw new Error('Expected lookup or record.');
  }
}
