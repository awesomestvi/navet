import { describe, expect, it } from 'vitest';
import { inspectImage, assertImageLabels } from './release-image.mjs';
import { compareVersions, imageVersions } from './release-channels.mjs';
import { assertSameArtifactIdentity, validateEvidence } from './release-evidence.mjs';

const sha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;

describe('immutable release artifacts', () => {
  it('reuses the registry digest rather than rebuilding an existing tag', () => {
    expect(
      inspectImage('image:version', {
        execute: () => ({ status: 0, stdout: JSON.stringify({ digest }) }),
      }),
    ).toBe(digest);
  });
  it('distinguishes absence from registry failures', () => {
    expect(
      inspectImage('image:version', {
        optional: true,
        execute: () => ({ status: 1, stderr: 'manifest unknown' }),
      }),
    ).toBeNull();
    for (const stderr of [
      'unauthorized',
      'connection timeout',
      '429 Too Many Requests',
      'unauthorized: not found',
    ]) {
      expect(() =>
        inspectImage('image:version', { optional: true, execute: () => ({ status: 1, stderr }) }),
      ).toThrow();
    }
  });
  it('rejects stable tags pointing at beta metadata or another commit', () => {
    const labels = {
      'org.opencontainers.image.version': '0.17.2-beta.1',
      'org.opencontainers.image.revision': sha,
      'io.navet.release-channel': 'beta',
    };
    expect(() =>
      assertImageLabels(labels, { version: '0.17.2', sha, channel: 'stable' }),
    ).toThrow();
    expect(() =>
      assertImageLabels(labels, { version: '0.17.2-beta.1', sha, channel: 'beta' }),
    ).not.toThrow();
    expect(() =>
      assertImageLabels(labels, { version: '0.17.2-beta.1', sha: 'c'.repeat(40), channel: 'beta' }),
    ).toThrow();
  });
  it.each([
    ['0.17.2', '0.17.2-beta.1', 1],
    ['0.17.2-beta.10', '0.17.2-beta.9', 1],
    ['0.17.2-beta.1', '0.17.2-rc.1', -1],
    ['0.17.1', '0.17.2', -1],
    ['0.17.2', '0.17.2', 0],
  ])('orders %s relative to %s without rolling channels backwards', (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });
  it('uses the add-on version instead of the inherited base-image version', () => {
    expect(
      imageVersions({
        config: {
          Labels: {
            'org.opencontainers.image.version': '2025.12.0',
            'io.hass.version': '0.17.2-beta.1',
          },
        },
      }),
    ).toEqual(['0.17.2-beta.1']);
    expect(
      imageVersions({
        config: { Labels: { 'org.opencontainers.image.version': '0.17.2-beta.1' } },
      }),
    ).toEqual(['0.17.2-beta.1']);
  });
  it('requires every distribution and binds evidence to version, commit and digest', () => {
    const version = '0.17.2-beta.1',
      tag = `v${version}`,
      owner = 'awesomestvi';
    const evidence = {
      schema: 1,
      tag,
      sha,
      version,
      channel: 'beta',
      runId: 123,
      panelDigest: digest,
      notesDigest: digest,
      images: ['navet', 'amd64-navet-addon', 'aarch64-navet-addon'].map((name) => ({
        image: `ghcr.io/${owner}/${name}`,
        tag: name === 'navet' ? tag : version,
        sha,
        version,
        channel: 'beta',
        digest,
      })),
    };
    expect(() => validateEvidence(evidence, { tag, sha, owner })).not.toThrow();
    expect(() => assertSameArtifactIdentity(evidence, { ...evidence, runId: 124 })).not.toThrow();
    expect(() =>
      assertSameArtifactIdentity(evidence, {
        ...evidence,
        notesDigest: `sha256:${'c'.repeat(64)}`,
      }),
    ).toThrow();
    expect(() =>
      validateEvidence({ ...evidence, notesDigest: undefined }, { tag, sha, owner }),
    ).toThrow();
    expect(() =>
      assertSameArtifactIdentity(evidence, {
        ...evidence,
        panelDigest: `sha256:${'c'.repeat(64)}`,
      }),
    ).toThrow();
    expect(() =>
      assertSameArtifactIdentity(evidence, {
        ...evidence,
        images: evidence.images.map((entry) => ({ ...entry, digest: `sha256:${'c'.repeat(64)}` })),
      }),
    ).toThrow();
    expect(() =>
      validateEvidence({ ...evidence, images: evidence.images.slice(1) }, { tag, sha, owner }),
    ).toThrow();
    expect(() => validateEvidence(evidence, { tag, sha: 'c'.repeat(40), owner })).toThrow();
    evidence.images[0].digest = 'latest';
    expect(() => validateEvidence(evidence, { tag, sha, owner })).toThrow();
  });
});
