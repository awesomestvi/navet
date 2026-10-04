import { createHash } from 'node:crypto';
import { createPlanningBinding } from './agent-planning-scope.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function payload(result) {
  // MCP tools return one JSON text payload. Truncated/mixed content and tool errors are not
  // complete service observations. Direct objects support installed transport adapters.
  if (result?.content) {
    if (result.isError || result.content.length !== 1 || result.content[0]?.type !== 'text' ||
        typeof result.content[0].text !== 'string' || Buffer.byteLength(result.content[0].text) > 1_048_576) {
      throw new Error('Incomplete connector response.');
    }
    return JSON.parse(result.content[0].text);
  }
  return result;
}

// Read tools are supplied by the connected coordinator, never by proposal contents. Connector
// account identity constrains reads; it cannot distinguish human approval from agent mutations.
export function createLinearConnectorIssueReader({ policy, getWorkspace, getUser, getIssue,
  now = () => Date.now(), maxReadMs = 20_000, signal }) {
  if (!policy || ['organizationId', 'readerUserId', 'teamId', 'projectId'].some((key) => !UUID.test(policy[key])) ||
      [getWorkspace, getUser, getIssue, now].some((value) => typeof value !== 'function') ||
      !Number.isSafeInteger(maxReadMs) || maxReadMs < 1 || maxReadMs > 60_000) {
    throw new Error('Connector reader requires scoped identities and bounded read tools.');
  }
  policy = structuredClone(policy);
  return async (issueId) => {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = reject; });
    const onAbort = () => rejectAbort(new Error('Canceled connector read.'));
    controller.signal.addEventListener('abort', onAbort, { once: true });
    // Pre-cancellation can precede the first raced tool call.
    void aborted.catch(() => {});
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, maxReadMs);
    const startedAt = now();
    const currentTime = () => {
      const value = now();
      if (controller.signal.aborted || !Number.isSafeInteger(startedAt) || startedAt <= 0 ||
          !Number.isSafeInteger(value) || value < startedAt || value - startedAt >= maxReadMs) {
        throw new Error('Stale connector read.');
      }
      return value;
    };
    const call = async (tool, args) => {
      currentTime();
      const result = await Promise.race([tool(args, { signal: controller.signal }), aborted]);
      currentTime();
      return payload(result);
    };
    try {
      if (signal?.aborted) controller.abort();
      if (!UUID.test(issueId)) throw new Error('Exact issue UUID required.');
      const snapshot = async () => {
        const workspace = await call(getWorkspace, {});
        const user = await call(getUser, { query: 'me' });
        if (workspace?.id !== policy.organizationId || user?.id !== policy.readerUserId || user.isActive !== true) {
          throw new Error('Connector identity mismatch.');
        }
        const raw = await call(getIssue, { id: issueId });
        if (raw?.uuid !== issueId || raw.teamId !== policy.teamId || raw.projectId !== policy.projectId ||
            !Array.isArray(raw.labels) || raw.labels.some((label) => typeof label !== 'string') ||
            !Array.isArray(raw.attachments) || !Number.isFinite(Date.parse(raw.updatedAt)) ||
            ['archivedAt', 'canceledAt'].some((key) => !Object.hasOwn(raw, key) ||
              (raw[key] !== null && (typeof raw[key] !== 'string' || !Number.isFinite(Date.parse(raw[key]))))) ||
            raw.hasNextPage === true || raw.pageInfo?.hasNextPage === true || raw.truncated === true ||
            raw.attachments.length > 1000 || raw.labels.length > 1000) {
          throw new Error('Incomplete connector issue.');
        }
        const issue = structuredClone({ id: raw.uuid, teamId: raw.teamId, projectId: raw.projectId,
          title: raw.title, description: raw.description, attachments: raw.attachments,
          labels: raw.labels, updatedAt: raw.updatedAt, archivedAt: raw.archivedAt, canceledAt: raw.canceledAt });
        createPlanningBinding(issue);
        return issue;
      };
      const fingerprint = (issue) => JSON.stringify({ binding: createPlanningBinding(issue),
        labels: [...issue.labels].sort(), updatedAt: issue.updatedAt, archivedAt: issue.archivedAt, canceledAt: issue.canceledAt });
      const before = await snapshot();
      const issue = await snapshot();
      const revision = fingerprint(issue);
      if (fingerprint(before) !== revision) throw new Error('Connector proposal changed between complete reads.');
      return { status: 'available', issue, observedAt: currentTime(),
        reference: 'linear-connector:sha256:' + createHash('sha256').update(revision).digest('hex') };
    } catch {
      return { status: 'unavailable', reference: 'linear-connector-unavailable', observedAt: now() };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', onAbort);
      controller.abort();
    }
  };
}
