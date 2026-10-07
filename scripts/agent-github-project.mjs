import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createPlanningBinding } from './agent-planning-scope.mjs';

const exec = promisify(execFile);
const ITEM = `id fullDatabaseId isArchived updatedAt project { id public closed url owner { ... on Organization { id login } } }
  content { ... on DraftIssue { id title body updatedAt } }
  fieldValues(first:100) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } } } pageInfo { hasNextPage } }`;
const QUERY = `query($id:ID!) { viewer { id } node(id:$id) { ... on ProjectV2Item { ${ITEM} } } }`;
const nodeId = (value) => typeof value === 'string' && /^[A-Za-z0-9_=-]{8,256}$/.test(value);
const text = (value, max) => typeof value === 'string' && value.trim() && Buffer.byteLength(value, 'utf8') <= max;

// Authentication stays in GitHub CLI's credential manager. Service errors and private bodies
// are not included in exceptions. The caller controls the trusted executable and token context.
export async function githubGraphql(query, variables = {}, { signal } = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    if (value !== null && value !== undefined) args.push(typeof value === 'number' || typeof value === 'boolean' ? '-F' : '-f', `${key}=${value}`);
  }
  try {
    const { stdout } = await exec('gh', args, { signal, timeout: 20_000, maxBuffer: 67_108_864 });
    const response = JSON.parse(stdout);
    if (response.errors?.length || !response.data) throw new Error();
    return response.data;
  } catch { throw new Error('GitHub Project request unavailable.'); }
}

export function validateGithubProjectPolicy(policy) {
  if (!policy || ['organizationId', 'projectId', 'viewerId'].some((key) => !nodeId(policy[key])) ||
      !/^[A-Za-z0-9-]+$/.test(policy.organizationLogin) || policy.stageField !== 'Proposal stage') {
    throw new Error('An exact private GitHub Project and authenticated reader policy are required.');
  }
  return structuredClone(policy);
}

function verifyProject(project, viewer, policy) {
  if (!project || project.id !== policy.projectId || project.public !== false || project.closed !== false ||
      project.owner?.id !== policy.organizationId || project.owner.login !== policy.organizationLogin || viewer?.id !== policy.viewerId) {
    throw new Error('Private GitHub Project identity or access changed.');
  }
}

export function normalizeGithubProjectDraft(response, itemId, policy) {
  verifyProject(response.node?.project, response.viewer, policy);
  const item = response.node;
  if (item.id !== itemId || !/^[0-9]+$/.test(String(item.fullDatabaseId)) || !nodeId(item.content?.id) || !text(item.content.title, 4096) ||
      typeof item.content.body !== 'string' || Buffer.byteLength(item.content.body, 'utf8') > 262_144 ||
      !Number.isFinite(Date.parse(item.updatedAt)) || typeof item.isArchived !== 'boolean' ||
      !Array.isArray(item.fieldValues?.nodes) || item.fieldValues.pageInfo?.hasNextPage !== false) {
    throw new Error('A complete Project draft is required.');
  }
  const stages = item.fieldValues.nodes.filter((value) => value?.field?.name === policy.stageField);
  if (stages.length !== 1 || !text(stages[0].name, 256)) throw new Error('One proposal stage is required.');
  const issue = { id: item.id, title: item.content.title, description: item.content.body || '(Empty draft)',
    teamId: policy.organizationId, projectId: policy.projectId, attachments: [], labels: [stages[0].name],
    updatedAt: item.updatedAt, archivedAt: item.isArchived ? item.updatedAt : null,
    canceledAt: ['Rejected', 'Superseded'].includes(stages[0].name) ? item.updatedAt : null };
  return { issue, draftId: item.content.id, url: `${item.project.url}?pane=issue&itemId=${item.fullDatabaseId}` };
}

// Project stages are observations, never authenticated human approval. Existing intake and
// dispatch contracts still require a separate exact-scope readRequest from a trusted source.
export function createGithubProjectIssueReader({ policy, graphql = githubGraphql, now = Date.now, maxReadMs = 20_000 } = {}) {
  policy = validateGithubProjectPolicy(policy);
  if (typeof graphql !== 'function' || typeof now !== 'function' || !Number.isSafeInteger(maxReadMs) || maxReadMs < 1 || maxReadMs > 60_000) {
    throw new Error('Bounded GitHub Project readers are required.');
  }
  return async (itemId) => {
    const startedAt = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), maxReadMs);
    let cancel;
    const expired = new Promise((_, reject) => { cancel = () => reject(new Error()); controller.signal.addEventListener('abort', cancel, { once: true }); });
    const read = async () => normalizeGithubProjectDraft(await Promise.race([graphql(QUERY, { id: itemId }, { signal: controller.signal }), expired]), itemId, policy);
    try {
      if (!nodeId(itemId) || !Number.isSafeInteger(startedAt) || startedAt <= 0) throw new Error();
      const first = await read();
      const second = await read();
      const observedAt = now();
      if (!isDeepStrictEqual(first, second) || controller.signal.aborted || !Number.isSafeInteger(observedAt) || observedAt < startedAt || observedAt - startedAt > maxReadMs) throw new Error();
      const binding = createPlanningBinding(second.issue);
      return { status: 'available', ...second, observedAt, reference: `github-project:${binding.revision}` };
    } catch { return { status: 'unavailable', reference: 'github-project-unavailable', observedAt: now() }; }
    finally { clearTimeout(timer); controller.signal.removeEventListener('abort', cancel); controller.abort(); }
  };
}

export async function listGithubProjectDrafts({ policy, graphql = githubGraphql, signal } = {}) {
  policy = validateGithubProjectPolicy(policy);
  const items = []; const cursors = new Set(); const ids = new Set(); let after;
  const query = `query($id:ID!,$after:String){viewer{id} node(id:$id){... on ProjectV2{id public closed url owner{... on Organization{id login}} items(first:25,after:$after,archivedStates:[ARCHIVED,NOT_ARCHIVED]){nodes{${ITEM}} pageInfo{hasNextPage endCursor}}}}}`;
  for (let page = 0; page < 500; page++) {
    const data = await graphql(query, { id: policy.projectId, after }, { signal });
    verifyProject(data.node, data.viewer, policy);
    const connection = data.node.items;
    if (!Array.isArray(connection?.nodes) || typeof connection.pageInfo?.hasNextPage !== 'boolean') throw new Error('Incomplete Project inventory.');
    for (const item of connection.nodes) {
      if (!nodeId(item.id) || ids.has(item.id)) throw new Error('Duplicate Project item identity.');
      ids.add(item.id);
      // Public issues/PRs may be linked after approval; only drafts are private proposals.
      if (!item.content?.id) continue;
      items.push(normalizeGithubProjectDraft({ viewer: data.viewer, node: item }, item.id, policy));
    }
    if (!connection.pageInfo.hasNextPage) return items;
    after = connection.pageInfo.endCursor;
    if (!after || cursors.has(after) || !connection.nodes.length) throw new Error('Project pagination did not advance.');
    cursors.add(after);
  }
  throw new Error('Project inventory exceeds its bounded limit.');
}

async function main() {
  const [configFile, action, inputFile] = process.argv.slice(2);
  const policy = JSON.parse(await readFile(configFile, 'utf8'));
  if (action === 'list') return listGithubProjectDrafts({ policy });
  const input = JSON.parse(await readFile(inputFile, 'utf8'));
  if (action === 'read') return createGithubProjectIssueReader({ policy })(input.itemId);
  throw new Error('Use list or read with a private input file.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((result) => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(() => { process.stderr.write('Private Project operation failed.\n'); process.exitCode = 1; });
}
