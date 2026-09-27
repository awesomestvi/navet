#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const API = 'https://api.github.com';
const MARKER = (tag) => `<!-- navet-stable-release:${tag} -->`;

function assertReleaseInput({ repository, tag, baseSha, releaseSha }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository.');
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error('Only stable release tags can notify issues.');
  for (const sha of [baseSha, releaseSha]) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Release commits must be full SHA values.');
  }
}

async function github(path, token, { method = 'GET', body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path} failed with ${response.status}.`);
  return response.json();
}

export async function includedIssueNumbers({ repository, commits, readToken, fetchImpl = fetch }) {
  const pullRequests = new Set();
  for (const sha of commits) {
    const associated = await github(
      `/repos/${repository}/commits/${sha}/pulls?per_page=100`,
      readToken,
      { fetchImpl },
    );
    for (const pr of associated) {
      if (pr.base?.repo?.full_name === repository && pr.base.ref === 'main' &&
          pr.merge_commit_sha === sha && pr.merged_at) pullRequests.add(pr.number);
    }
  }

  const issues = new Set();
  for (const number of pullRequests) {
    let cursor = null;
    do {
      const result = await github('/graphql', readToken, {
        method: 'POST', fetchImpl,
        body: {
          query: `query($owner:String!,$name:String!,$number:Int!,$cursor:String) {
            repository(owner:$owner,name:$name) {
              pullRequest(number:$number) {
                closingIssuesReferences(first:100,after:$cursor) {
                  nodes { number repository { nameWithOwner } }
                  pageInfo { hasNextPage endCursor }
                }
              }
            }
          }`,
          variables: {
            owner: repository.split('/')[0], name: repository.split('/')[1], number, cursor,
          },
        },
      });
      if (result.errors?.length) throw new Error(`Could not read linked issues for PR #${number}.`);
      const references = result.data?.repository?.pullRequest?.closingIssuesReferences;
      if (!references) throw new Error(`Missing linked issue data for PR #${number}.`);
      for (const issue of references.nodes) {
        if (issue.repository?.nameWithOwner === repository) issues.add(issue.number);
      }
      cursor = references.pageInfo.hasNextPage ? references.pageInfo.endCursor : null;
      if (references.pageInfo.hasNextPage && !cursor) throw new Error('Missing issue page cursor.');
    } while (cursor);
  }
  return [...issues].sort((a, b) => a - b);
}

export async function notifyReleaseIssues({ repository, tag, baseSha, releaseSha, readToken,
  nisseToken, commits, fetchImpl = fetch }) {
  assertReleaseInput({ repository, tag, baseSha, releaseSha });
  const issueNumbers = await includedIssueNumbers({ repository, commits, readToken, fetchImpl });
  let posted = 0;
  for (const number of issueNumbers) {
    const marker = MARKER(tag);
    let page = 1;
    let alreadyPosted = false;
    while (true) {
      const comments = await github(
        `/repos/${repository}/issues/${number}/comments?per_page=100&page=${page}`,
        readToken, { fetchImpl },
      );
      if (comments.some((comment) =>
        comment.user?.login === 'navet-nisse[bot]' && comment.body?.includes(marker))) {
        alreadyPosted = true;
        break;
      }
      if (comments.length < 100) break;
      page++;
    }
    if (alreadyPosted) continue;
    await github(`/repos/${repository}/issues/${number}/comments`, nisseToken, {
      method: 'POST', fetchImpl,
      body: { body: `${marker}\nThe fix for this issue is included in [Navet ${tag}]` +
        `(https://github.com/${repository}/releases/tag/${tag}). The stable release is available now.` },
    });
    posted++;
  }
  return { included: issueNumbers.length, posted };
}

async function main() {
  const { GITHUB_REPOSITORY: repository, RELEASE_TAG: tag, NOTES_BASE_TAG: baseTag,
    RELEASE_SHA: releaseSha, GH_TOKEN: readToken, NAVET_NISSE_TOKEN: nisseToken } = process.env;
  if (!baseTag || !readToken || !nisseToken) throw new Error('Release context and both tokens are required.');
  const baseSha = execFileSync('git', ['rev-parse', `${baseTag}^{commit}`], { encoding: 'utf8' }).trim();
  const commits = execFileSync('git', ['rev-list', '--first-parent', '--reverse', `${baseSha}..${releaseSha}`],
    { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const result = await notifyReleaseIssues({ repository, tag, baseSha, releaseSha, readToken,
    nisseToken, commits });
  console.log(`Linked issues in ${tag}: ${result.included}; new comments: ${result.posted}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
