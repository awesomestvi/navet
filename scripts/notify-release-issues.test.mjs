import { describe, expect, it, vi } from 'vitest';
import { includedIssueNumbers, notifyReleaseIssues } from './notify-release-issues.mjs';

const repository = 'awesomestvi/navet';
const baseSha = 'a'.repeat(40);
const releaseSha = 'b'.repeat(40);
const commits = ['c'.repeat(40), 'd'.repeat(40)];

function response(body) {
  return { ok: true, json: async () => body };
}

function fixtureFetch({ existingComment = false } = {}) {
  const requests = [];
  const fetchImpl = vi.fn(async (url, init) => {
    requests.push({ url, init });
    if (url.includes(`/commits/${commits[0]}/pulls`)) {
      return response([
        { number: 42, merged_at: '2026-09-20', merge_commit_sha: commits[0],
          base: { ref: 'main', repo: { full_name: repository } } },
        { number: 43, merged_at: '2026-09-20', merge_commit_sha: 'e'.repeat(40),
          base: { ref: 'main', repo: { full_name: repository } } },
      ]);
    }
    if (url.includes(`/commits/${commits[1]}/pulls`)) {
      return response([{ number: 44, merged_at: '2026-09-21', merge_commit_sha: commits[1],
        base: { ref: 'main', repo: { full_name: repository } } }]);
    }
    if (url.endsWith('/graphql')) {
      const number = JSON.parse(init.body).variables.number;
      return response({ data: { repository: { pullRequest: { closingIssuesReferences: {
        nodes: number === 42
          ? [{ number: 7, repository: { nameWithOwner: repository } },
            { number: 8, repository: { nameWithOwner: 'someone/else' } }]
          : [{ number: 7, repository: { nameWithOwner: repository } },
            { number: 9, repository: { nameWithOwner: repository } }],
        pageInfo: { hasNextPage: false, endCursor: null },
      } } } } });
    }
    if (url.includes('/issues/7/comments?')) {
      return response(existingComment
        ? [{ user: { login: 'navet-nisse[bot]' },
          body: '<!-- navet-stable-release:v0.18.0 -->\nAlready notified.' }]
        : []);
    }
    if (url.includes('/comments?')) return response([]);
    if (init.method === 'POST') return response({ id: 1 });
    throw new Error(`Unexpected request: ${url}`);
  });
  return { fetchImpl, requests };
}

describe('stable release issue notifications', () => {
  it('selects only same-repository issues linked to PRs merged in the release range', async () => {
    const { fetchImpl } = fixtureFetch();
    expect(await includedIssueNumbers({ repository, commits, readToken: 'read', fetchImpl }))
      .toEqual([7, 9]);
  });

  it('uses Navet Nisse to comment once per issue and skips prior notifications on retry', async () => {
    const { fetchImpl, requests } = fixtureFetch({ existingComment: true });
    const result = await notifyReleaseIssues({ repository, tag: 'v0.18.0', baseSha, releaseSha,
      commits, readToken: 'read', nisseToken: 'nisse', fetchImpl });
    expect(result).toEqual({ included: 2, posted: 1 });
    const writes = requests.filter(({ url, init }) => url.endsWith('/comments') && init.method === 'POST');
    expect(writes).toHaveLength(1);
    expect(writes[0].url).toContain('/issues/9/comments');
    expect(writes[0].init.headers.Authorization).toBe('Bearer nisse');
    expect(JSON.parse(writes[0].init.body).body).toContain('releases/tag/v0.18.0');
  });

  it('rejects candidate tags', async () => {
    await expect(notifyReleaseIssues({ repository, tag: 'v0.18.0-beta.1', baseSha,
      releaseSha, commits, readToken: 'read', nisseToken: 'nisse' }))
      .rejects.toThrow('Only stable release tags');
  });
});
