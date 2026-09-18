#!/usr/bin/env node
import { appendFile } from 'node:fs/promises';
import { classifyFiles, requiredApprovalGates } from './change-impact.mjs';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const pullNumber = Number(process.env.PR_NUMBER);

if (!token || !repository || !Number.isInteger(pullNumber)) {
  throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY, and PR_NUMBER are required.');
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function get(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function getAll(path) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await get(`${path}${separator}per_page=100&page=${page}`);
    values.push(...batch);
    if (batch.length < 100) return values;
  }
}

const [owner, repo] = repository.split('/');
const pull = await get(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
const files = await getAll(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
const combinedStatus = await get(`/repos/${owner}/${repo}/commits/${pull.head.sha}/status`);
const labels = pull.labels.map(({ name }) => name);
const impact = classifyFiles(files.map(({ filename }) => filename));
const required = requiredApprovalGates(impact, labels);
const successfulStatuses = new Set(
  combinedStatus.statuses
    .filter(({ state }) => state === 'success')
    .map(({ context }) => context)
);
const approvals = {
  product: successfulStatuses.has('navet/product-approval'),
  foundation: successfulStatuses.has('navet/foundation-approval'),
  security: successfulStatuses.has('navet/security-approval'),
};
const missing = Object.keys(required).filter((gate) => required[gate] && !approvals[gate]);

const rows = Object.keys(required).map(
  (gate) => `| ${gate} | ${required[gate] ? 'required' : 'not required'} | ${approvals[gate] ? 'approved' : 'pending'} |`
);
const summary = [
  '## Human approval gates',
  '',
  '| Gate | Requirement | Current head |',
  '| --- | --- | --- |',
  ...rows,
  '',
].join('\n');

process.stdout.write(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (missing.length > 0) {
  throw new Error(`Missing approval for current PR head: ${missing.join(', ')}`);
}
