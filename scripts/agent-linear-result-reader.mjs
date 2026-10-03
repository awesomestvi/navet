import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { linearResultTimesMatch } from './agent-linear-result-time.mjs';
import { readLinearResponseJson } from './agent-linear-reader.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^sha256:[a-f0-9]{64}$/;
const ENDPOINT = 'https://api.linear.app/graphql';
export const LINEAR_RESULT_QUERY = `query NavetPlanningResult($id: String!) {
  organization { id }
  viewer { id app active }
  comment(id: $id) {
    id body url createdAt updatedAt archivedAt
    user { id app active }
    onBehalfOf { id }
    syncedWith { __typename }
    issue { id archivedAt canceledAt team { id } project { id } }
  }
}`;

export function linearResultBodyHash(body) {
  if (typeof body !== 'string' || !body.trim() || Buffer.byteLength(body, 'utf8') > 262_144) {
    throw new Error('Planning result requires bounded nonempty Markdown.');
  }
  return 'sha256:' + createHash('sha256').update(body, 'utf8').digest('hex');
}

// Read back an exact comment through an independently configured read-only app. This verifies
// a result artifact, not its quality, human approval, proposal scope or the absence of other
// publication channels. No body, token or remote error is returned to queue callers.
export function createLinearResultReader({ getAccessToken, policy, fetchImpl = globalThis.fetch,
  now = () => Date.now(), maxReadMs = 20_000 }) {
  if (typeof getAccessToken !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' ||
      !policy || ['organizationId', 'appUserId', 'writerAppUserId', 'teamId', 'projectId']
        .some((key) => !UUID.test(policy[key])) ||
      !Number.isSafeInteger(maxReadMs) || maxReadMs < 1 || maxReadMs > 60_000) {
    throw new Error('Linear result reader requires scoped app identities and a bounded read.');
  }
  policy = structuredClone(policy);
  return async (expected) => {
    const startedAt = now();
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Result read deadline exceeded.')); }, maxReadMs);
    });
    const bounded = (operation) => Promise.race([operation, timeout]);
    try {
      expected = structuredClone(expected);
      if (!UUID.test(expected?.commentId) || !UUID.test(expected?.issueId) || !HASH.test(expected?.bodyHash) ||
          !Number.isSafeInteger(expected?.notBefore) || expected.notBefore <= 0 || expected.notBefore > startedAt ||
          !Number.isSafeInteger(startedAt) || startedAt <= 0) throw new Error('Invalid expected result.');
      const token = await bounded(getAccessToken({ signal: controller.signal }));
      if (typeof token !== 'string' || !token.trim() || token.length > 8192 || /[\r\n]/.test(token)) {
        throw new Error('Result read token unavailable.');
      }
      const snapshot = async () => {
        const response = await bounded(fetchImpl(ENDPOINT, {
          method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: LINEAR_RESULT_QUERY, variables: { id: expected.commentId } }),
        }));
        const result = await readLinearResponseJson(response, bounded);
        if (result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) {
          throw new Error('Result service returned errors.');
        }
        const { organization, viewer, comment } = result.data ?? {};
        const issue = comment?.issue;
        if (organization?.id !== policy.organizationId || viewer?.id !== policy.appUserId ||
            viewer.app !== true || viewer.active !== true || comment?.id !== expected.commentId ||
            comment.user?.id !== policy.writerAppUserId || comment.user.app !== true || comment.user.active !== true ||
            comment.onBehalfOf !== null || !Array.isArray(comment.syncedWith) || comment.syncedWith.length ||
            comment.archivedAt !== null || issue?.id !== expected.issueId || issue.team?.id !== policy.teamId ||
            issue.project?.id !== policy.projectId || issue.archivedAt !== null || issue.canceledAt !== null) {
          throw new Error('Result identity, lifecycle or synchronization mismatch.');
        }
        if (typeof comment.createdAt !== 'string' || typeof comment.updatedAt !== 'string' ||
            typeof comment.url !== 'string' || comment.url.length > 4096) throw new Error('Incomplete result metadata.');
        const observed = now();
        if (!Number.isSafeInteger(observed) || observed < startedAt || observed - startedAt > maxReadMs ||
            !linearResultTimesMatch({ createdAt: comment.createdAt, updatedAt: comment.updatedAt,
              notBefore: expected.notBefore, observedAt: observed })) {
          throw new Error('Result time mismatch.');
        }
        const bodyHash = linearResultBodyHash(comment.body);
        if (bodyHash !== expected.bodyHash) throw new Error('Result content mismatch.');
        const url = new URL(comment.url);
        if (url.origin !== 'https://linear.app' || url.username || url.password ||
            !/^\/[^/]+\/issue\/[^/]+(?:\/.*)?$/.test(url.pathname)) throw new Error('Invalid result URL.');
        return { commentId: comment.id, issueId: issue.id, authorId: comment.user.id,
          bodyHash, url: url.href, createdAt: comment.createdAt, updatedAt: comment.updatedAt };
      };
      const first = await snapshot();
      const result = await snapshot();
      if (!isDeepStrictEqual(first, result)) throw new Error('Result changed during read.');
      const observedAt = now();
      if (!Number.isSafeInteger(observedAt) || observedAt < startedAt || observedAt - startedAt > maxReadMs) {
        throw new Error('Result observation is stale.');
      }
      return { status: 'available', result, observedAt,
        reference: 'linear-result:sha256:' + createHash('sha256').update(JSON.stringify(result)).digest('hex') };
    } catch {
      return { status: 'unavailable', reference: 'linear-result-unavailable', observedAt: now() };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  };
}
