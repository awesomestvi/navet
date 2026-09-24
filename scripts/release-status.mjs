#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateEvidence } from './release-evidence.mjs';
import { compareVersions } from './release-channels.mjs';

const repository = 'awesomestvi/navet';
const stableTag = /^v\d+\.\d+\.\d+$/;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

async function readJson(url, { fetchImpl = fetch, token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('Could not reach GitHub to verify the latest completed stable release.');
  }
  if (!response.ok) {
    throw new Error(`GitHub release lookup failed (${response.status}). Check network access or GH_TOKEN.`);
  }
  return response.json();
}

export async function latestPublishedStable({ releases, readEvidence, readRun, resolveTag }) {
  const candidates = releases
    .filter((release) => !release.draft && !release.prerelease && stableTag.test(release.tag_name))
    .sort((a, b) => compareVersions(b.tag_name.slice(1), a.tag_name.slice(1)));

  for (const release of candidates) {
    const asset = release.assets?.find((entry) => entry.name === 'navet-release-evidence.json');
    if (!asset) continue;
    const sha = resolveTag(release.tag_name);
    if (!sha) throw new Error(`Fetch the local ${release.tag_name} tag before checking release status.`);
    const evidence = await readEvidence(asset);
    try {
      validateEvidence(evidence, { tag: release.tag_name, sha, owner: repository.split('/')[0] });
    } catch {
      continue;
    }
    const run = await readRun(evidence.runId);
    if (run.conclusion === 'success' && run.path === '.github/workflows/release.yml') {
      return { tag: release.tag_name, sha };
    }
  }
  throw new Error('No successfully published stable release with verified evidence was found.');
}

export function classifyFragments({ files, releaseSha, head = 'HEAD', gitImpl = git }) {
  gitImpl('merge-base', '--is-ancestor', releaseSha, head);
  const tracked = new Set(
    gitImpl('ls-files', '--', '.changes').split('\n').filter((file) => file.endsWith('.yaml')),
  );
  const released = [];
  const pending = [];
  const local = [];
  const revised = [];
  for (const file of files.sort()) {
    if (!tracked.has(file)) {
      local.push(file);
      continue;
    }
    let publishedBlob;
    try {
      publishedBlob = gitImpl('rev-parse', '--verify', `${releaseSha}:${file}`);
    } catch {
      pending.push(file);
      continue;
    }
    const currentBlob = gitImpl('hash-object', file);
    if (currentBlob === publishedBlob) released.push(file);
    else revised.push(file);
  }
  return { released, pending, local, revised };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--all')) throw new Error('Usage: pnpm release:status [--all]');
  const all = args.includes('--all');
  const releases = [];
  for (let page = 1; ; page++) {
    const batch = await readJson(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`);
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  const baseline = await latestPublishedStable({
    releases,
    resolveTag(tag) {
      try { return git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`); }
      catch { return null; }
    },
    readEvidence: (asset) => readJson(asset.browser_download_url),
    readRun: (id) => readJson(`https://api.github.com/repos/${repository}/actions/runs/${id}`),
  });
  const files = readdirSync('.changes')
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => `.changes/${name}`);
  let status;
  try {
    status = classifyFragments({ files, releaseSha: baseline.sha });
  } catch (error) {
    if (error?.status === 1) {
      throw new Error(`Current HEAD does not contain ${baseline.tag}. Switch to a branch based on that release.`);
    }
    throw error;
  }
  console.log(`Last completed stable release: ${baseline.tag} (${baseline.sha.slice(0, 7)})`);
  console.log(`Pending: ${status.pending.length}; released: ${status.released.length}; local: ${status.local.length}; revised: ${status.revised.length}`);
  for (const file of status.pending) console.log(`  pending   ${file}`);
  for (const file of status.local) console.log(`  local     ${file}`);
  for (const file of status.revised) console.log(`  revised   ${file} (use a new fragment for a new release)`);
  if (all) for (const file of status.released) console.log(`  released  ${file}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
