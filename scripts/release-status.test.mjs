import { describe, expect, it, vi } from 'vitest';
import { classifyFragments, latestPublishedStable } from './release-status.mjs';

const sha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;

function evidence(tag, runId) {
  const version = tag.slice(1);
  return {
    schema: 1, tag, sha, version, channel: 'stable', runId,
    panelDigest: digest, notesDigest: digest,
    images: ['navet', 'amd64-navet-addon', 'aarch64-navet-addon'].map((name) => ({
      image: `ghcr.io/awesomestvi/${name}`,
      tag: name === 'navet' ? tag : version,
      sha, version, channel: 'stable', digest,
    })),
  };
}

describe('release fragment status', () => {
  it('chooses the newest stable release with matching evidence and a completed publication run', async () => {
    const releases = ['v0.17.3', 'v0.17.2', 'v0.17.1'].map((tag, index) => ({
      tag_name: tag, draft: false, prerelease: false,
      assets: index === 0 ? [] : [{ name: 'navet-release-evidence.json', tag }],
    }));
    const result = await latestPublishedStable({
      releases,
      resolveTag: () => sha,
      readEvidence: ({ tag }) => evidence(tag, tag === 'v0.17.2' ? 12 : 11),
      readRun: async (id) => ({
        conclusion: id === 12 ? 'failure' : 'success', path: '.github/workflows/release.yml',
      }),
    });
    expect(result).toEqual({ tag: 'v0.17.1', sha });
  });

  it('refuses an unverified latest release when its tag is unavailable locally', async () => {
    await expect(latestPublishedStable({
      releases: [{ tag_name: 'v0.17.3', draft: false, prerelease: false,
        assets: [{ name: 'navet-release-evidence.json' }] }],
      resolveTag: () => null,
      readEvidence: vi.fn(), readRun: vi.fn(),
    })).rejects.toThrow('Fetch the local v0.17.3 tag');
  });

  it('shows released, pending, and uncommitted entries without changing files', () => {
    const blobs = new Map([
      [`${sha}:.changes/released.yaml`, 'released-blob'],
      [`${sha}:.changes/revised.yaml`, 'old-blob'],
      ['.changes/released.yaml', 'released-blob'],
      ['.changes/pending.yaml', 'new-blob'],
      ['.changes/revised.yaml', 'new-blob'],
    ]);
    const gitImpl = vi.fn((...args) => {
      if (args[0] === 'merge-base') return '';
      if (args[0] === 'ls-files') return '.changes/released.yaml\n.changes/pending.yaml\n.changes/revised.yaml';
      const blob = blobs.get(args.at(-1));
      if (!blob) throw new Error('Not found');
      return blob;
    });
    expect(classifyFragments({
      files: ['.changes/revised.yaml', '.changes/local.yaml', '.changes/released.yaml',
        '.changes/pending.yaml'],
      releaseSha: sha, gitImpl,
    })).toEqual({
      released: ['.changes/released.yaml'],
      pending: ['.changes/pending.yaml'],
      local: ['.changes/local.yaml'],
      revised: ['.changes/revised.yaml'],
    });
  });
});
