import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { createPlanningBinding } from './agent-planning-scope.mjs';

const ENDPOINT = 'https://api.linear.app/graphql';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const QUERY = `query NavetPlanningIssue($id: String!, $attachmentsAfter: String, $labelsAfter: String,
  $readAttachments: Boolean!, $readLabels: Boolean!) {
  organization { id }
  viewer { id app active }
  issue(id: $id) {
    id title description updatedAt archivedAt canceledAt team { id } project { id }
    attachments(first: 50, after: $attachmentsAfter) @include(if: $readAttachments) {
      nodes { id url } pageInfo { hasNextPage endCursor }
    }
    labels(first: 50, after: $labelsAfter) @include(if: $readLabels) {
      nodes { id name } pageInfo { hasNextPage endCursor }
    }
  }
}`;

function requireText(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Incomplete planning service response.');
  return value;
}

export async function readLinearResponseJson(response, bounded, maxBytes = 1_048_576) {
  if (!response?.ok || !response.body?.getReader) throw new Error('Planning service unavailable.');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await bounded(reader.read());
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('Planning service response exceeds its limit.');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    // Cancel without allowing an unresponsive remote stream to extend the read deadline.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function addPage(connection, state, kind) {
  if (!connection || !Array.isArray(connection.nodes) || !connection.pageInfo ||
      typeof connection.pageInfo.hasNextPage !== 'boolean') throw new Error('Incomplete planning connection.');
  for (const node of connection.nodes) {
    const id = requireText(node?.id);
    if (!UUID.test(id) || state.ids.has(id)) throw new Error('Invalid or duplicate planning connection identity.');
    state.ids.add(id);
    state.nodes.push(kind === 'attachments' ? { id, url: requireText(node.url) } : { id, name: requireText(node.name) });
  }
  state.complete = !connection.pageInfo.hasNextPage;
  if (!state.complete) {
    const cursor = requireText(connection.pageInfo.endCursor);
    if (!connection.nodes.length || state.cursors.has(cursor)) throw new Error('Planning pagination did not advance.');
    state.cursors.add(cursor);
    state.after = cursor;
  }
}

// Read-only OAuth adapter. The installed app identity must be configured independently.
// The token callback owns secure token storage/refresh; tokens and remote errors are never logged.
// The fixed endpoint and redirect policy prevent forwarding credentials to arbitrary URLs.
export function createLinearIssueReader({ getAccessToken, policy, fetchImpl = globalThis.fetch,
  now = () => Date.now(), maxReadMs = 20_000, maxPages = 20 }) {
  if (typeof getAccessToken !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' ||
      !policy || ['organizationId', 'appUserId', 'teamId', 'projectId'].some((key) => !UUID.test(policy[key])) ||
      !Number.isSafeInteger(maxReadMs) || maxReadMs < 1 || maxReadMs > 60_000 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 20) {
    throw new Error('Linear reader requires a scoped app policy and bounded service configuration.');
  }
  policy = structuredClone(policy);
  return async (issueId) => {
    const startedAt = now();
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Planning read deadline exceeded.')); }, maxReadMs);
    });
    const bounded = (operation) => Promise.race([operation, timeout]);
    try {
      if (!UUID.test(issueId) || !Number.isSafeInteger(startedAt) || startedAt <= 0) throw new Error('Invalid planning read.');
      const token = await bounded(getAccessToken({ signal: controller.signal }));
      if (typeof token !== 'string' || !token.trim() || token.length > 8192 || /[\r\n]/.test(token)) {
        throw new Error('Planning access token unavailable.');
      }
      const snapshot = async () => {
        const connections = Object.fromEntries(['attachments', 'labels'].map((kind) => [kind,
          { complete: false, after: null, nodes: [], ids: new Set(), cursors: new Set() }]));
        let core;
        for (let page = 0; page < maxPages; page++) {
          const response = await bounded(fetchImpl(ENDPOINT, { method: 'POST', redirect: 'error', cache: 'no-store',
            signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: QUERY, variables: { id: issueId,
              attachmentsAfter: connections.attachments.after, labelsAfter: connections.labels.after,
              readAttachments: !connections.attachments.complete, readLabels: !connections.labels.complete } }) }));
          const result = await readLinearResponseJson(response, bounded);
          if (result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) {
            throw new Error('Planning service returned errors.');
          }
          const { organization, viewer, issue } = result.data ?? {};
          if (organization?.id !== policy.organizationId || viewer?.id !== policy.appUserId ||
              viewer.app !== true || viewer.active !== true || issue?.id !== issueId ||
              issue.team?.id !== policy.teamId || issue.project?.id !== policy.projectId) {
            throw new Error('Planning service identity mismatch.');
          }
          const current = { id: issue.id, title: issue.title, description: issue.description,
            teamId: issue.team.id, projectId: issue.project.id, updatedAt: issue.updatedAt,
            archivedAt: issue.archivedAt, canceledAt: issue.canceledAt };
          if (!Number.isFinite(Date.parse(current.updatedAt)) ||
              ['archivedAt', 'canceledAt'].some((key) => current[key] !== null &&
                (typeof current[key] !== 'string' || !Number.isFinite(Date.parse(current[key]))))) {
            throw new Error('Incomplete planning lifecycle response.');
          }
          if (core && !isDeepStrictEqual(core, current)) throw new Error('Planning issue changed during pagination.');
          core = current;
          for (const kind of ['attachments', 'labels']) {
            if (!connections[kind].complete) addPage(issue[kind], connections[kind], kind);
          }
          if (connections.attachments.complete && connections.labels.complete) {
            return { ...core, attachments: connections.attachments.nodes, labels: connections.labels.nodes.map((label) => label.name) };
          }
        }
        throw new Error('Planning pagination exceeds its limit.');
      };
      const fingerprint = (issue) => JSON.stringify({ binding: createPlanningBinding(issue),
        labels: [...issue.labels].sort(), updatedAt: issue.updatedAt, archivedAt: issue.archivedAt, canceledAt: issue.canceledAt });
      // Two complete reads catch changes to labels/attachments even when issue.updatedAt stays
      // unchanged. This is a bounded stability check, not a transactional service snapshot.
      const before = await snapshot();
      const issue = await snapshot();
      const revision = fingerprint(issue);
      if (fingerprint(before) !== revision) throw new Error('Planning proposal changed between service reads.');
      const observedAt = now();
      if (!Number.isSafeInteger(observedAt) || observedAt < startedAt || observedAt - startedAt > maxReadMs) {
        throw new Error('Planning service read is stale.');
      }
      return { status: 'available', issue, observedAt,
        reference: 'linear-service:sha256:' + createHash('sha256').update(revision).digest('hex') };
    } catch {
      // Not-found and permission-masked errors remain unavailable: do not invent deletion evidence.
      return { status: 'unavailable', reference: 'linear-service-unavailable', observedAt: now() };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };
}
