import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { assertImageLabels, digestPattern } from './release-image.mjs';

const arch = process.env.NAVET_ADDON_TEST_ARCH;
if (!['amd64', 'aarch64'].includes(arch))
  throw new Error('A release runtime architecture is required.');
const platform = arch === 'amd64' ? 'linux/amd64' : 'linux/arm64';
const images = ['navet', `${arch}-navet-addon`].map((name) => {
  const record = JSON.parse(readFileSync(`release-images/${name}.json`, 'utf8'));
  if (
    !digestPattern.test(record.digest) ||
    record.image !== `ghcr.io/${process.env.GITHUB_REPOSITORY_OWNER}/${name}`
  ) {
    throw new Error('Invalid artifact identity.');
  }
  const image = `${record.image}@${record.digest}`;
  execFileSync('docker', ['pull', '--platform', platform, image], { stdio: 'inherit' });
  const imageInfo = JSON.parse(
    execFileSync('docker', ['image', 'inspect', '--format', '{{json .}}', image], {
      encoding: 'utf8',
    }),
  );
  if (`${imageInfo.Os}/${imageInfo.Architecture}` !== platform) {
    throw new Error(`Pulled artifact does not match required platform ${platform}.`);
  }
  assertImageLabels(imageInfo.Config?.Labels, {
    version: process.env.VERSION,
    sha: process.env.RELEASE_SHA,
    channel: process.env.RELEASE_CHANNEL,
  });
  return image;
});
execFileSync(process.execPath, [resolve(import.meta.dirname, 'check-docker-runtime.mjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DOCKER_DEFAULT_PLATFORM: platform,
    NAVET_TEST_STANDALONE_IMAGE: images[0],
    NAVET_TEST_ADDON_IMAGE: images[1],
    NAVET_TEST_BUILD_VERSION: process.env.VERSION,
  },
});
