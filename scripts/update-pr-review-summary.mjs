#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { approvalsFromStatuses } from './approval-status.mjs';
import {
  classifyFiles,
  impactLabels,
  MANAGED_IMPACT_LABELS,
  requiredApprovalGates,
} from './change-impact.mjs';

const MARKER = '<!-- navet-pr-review-summary -->';
const SUMMARY_AUTHOR = 'github-actions[bot]';
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const run = event.workflow_run;
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!run || !token || !repository) {
  throw new Error('This script requires a workflow_run event, GITHUB_TOKEN, and GITHUB_REPOSITORY.');
}

const pullReference = run.pull_requests?.[0];
if (!pullReference) {
  process.stdout.write('The workflow run is not associated with a pull request.\n');
  process.exit(0);
}

const [owner, repo] = repository.split('/');
const pullNumber = pullReference.number;
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

async function request(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!response.ok) {
    const error = new Error(
      `${init.method ?? 'GET'} ${path} failed with ${response.status}: ${await response.text()}`
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

async function getAll(path) {
  const values = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await request(`${path}${separator}per_page=100&page=${page}`);
    values.push(...batch);
    if (batch.length < 100) return values;
  }
}

function branchAlias(branch) {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const pull = await request(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
if (pull.head.sha !== run.head_sha) {
  process.stdout.write('Ignoring a workflow run for an older PR head.\n');
  process.exit(0);
}
const changedFiles = await getAll(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
const comments = await getAll(`/repos/${owner}/${repo}/issues/${pullNumber}/comments`);
const statuses = await getAll(`/repos/${owner}/${repo}/commits/${pull.head.sha}/statuses`);
const labels = pull.labels.map(({ name }) => name);
const impact = classifyFiles(changedFiles.map(({ filename }) => filename));
const gates = requiredApprovalGates(impact, labels);
const approvals = approvalsFromStatuses(statuses);
const alias = branchAlias(pull.head.ref);
const succeeded = run.conclusion === 'success';
const title = succeeded ? 'Ready for Merge Review' : 'Validation Failed';
const gateRows = [
  ['Foundation', gates.foundation, approvals.foundation, `/approve-foundation ${pull.head.sha}`],
  ['Security', gates.security, approvals.security, `/approve-security ${pull.head.sha}`],
]
  .filter(([, required]) => required)
  .map(([name, , approved, command]) => `| ${name} | ${approved ? '✓ approved' : `pending — comment \`${command}\``} |`);

const body = [
  MARKER,
  `## PR #${pullNumber} — ${title}`,
  '',
  `| Validation | Result |`,
  `| --- | --- |`,
  `| Deterministic CI | ${succeeded ? '✓ passed' : `✗ ${run.conclusion ?? 'unknown'}`} |`,
  `| Responsive screenshots | [Open CI run and artifacts](${run.html_url}) |`,
  `| Cloudflare previews | Confirm every configured deployment check on this PR is green |`,
  '',
  '### Preview',
  '',
  `- [Interactive demo](https://${alias}.navet-demo.pages.dev/demo/home)`,
  `- [Storybook](https://${alias}.navet-storybook.pages.dev/)`,
  `- [Documentation](https://${alias}.navet-docs.pages.dev/)`,
  `- [Website](https://${alias}.navet.pages.dev/)`,
  '',
  'Cloudflare branch aliases may take a few minutes to appear. A link is reviewable only when its project is configured for branch previews; reported deployment checks are the source of truth.',
  '',
  ...(gateRows.length > 0
    ? ['### Human approval', '', '| Gate | Current PR head |', '| --- | --- |', ...gateRows, '']
    : []),
  '### Change impact',
  '',
  impactLabels(impact).length > 0 ? impactLabels(impact).map((label) => `\`${label}\``).join(' · ') : 'No specialized impact detected.',
  '',
  'Normal PR feedback is enough for another agent iteration. Any new commit invalidates prior human approval.',
].join('\n');

const previous = comments.find(
  (comment) => comment.user?.login === SUMMARY_AUTHOR && comment.body?.includes(MARKER)
);
if (previous) {
  await request(`/repos/${owner}/${repo}/issues/comments/${previous.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
} else {
  await request(`/repos/${owner}/${repo}/issues/${pullNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

const desiredImpactLabels = impactLabels(impact);
const desiredImpactLabelSet = new Set(desiredImpactLabels);
for (const label of labels.filter(
  (name) => MANAGED_IMPACT_LABELS.includes(name) && !desiredImpactLabelSet.has(name)
)) {
  await request(`/repos/${owner}/${repo}/issues/${pullNumber}/labels/${encodeURIComponent(label)}`, {
    method: 'DELETE',
  });
}
if (desiredImpactLabels.length > 0) {
  await request(`/repos/${owner}/${repo}/issues/${pullNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: desiredImpactLabels }),
  });
}
