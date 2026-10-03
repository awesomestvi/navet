import { isDeepStrictEqual } from 'node:util';
import { readLinearResponseJson } from './agent-linear-reader.mjs';
import { linearResultBodyHash } from './agent-linear-result-reader.mjs';
import { validatePlanningRequestObservation } from './agent-planning-intake.mjs';
import { evaluatePlanningObservation, requirePlanningScope } from './agent-planning-scope.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ENDPOINT = 'https://api.linear.app/graphql';
export const LINEAR_RESULT_DESTINATION_QUERY = `query NavetResultDestination($id: String!) {
  organization { id }
  viewer { id app active }
  issue(id: $id) { id updatedAt archivedAt canceledAt team { id } project { id } syncedWith { __typename } }
}`;
export const LINEAR_RESULT_CREATE_MUTATION = `mutation NavetResultCreate($input: CommentCreateInput!) {
  commentCreate(input: $input) { success comment { id issue { id team { id } project { id } } user { id app active } } }
}`;

// One attempted create per writer session. The coordinator owns durable intent and recovery.
// readIssue and readRequest must independently authenticate live scope and human authority.
// The writer cannot establish those facts from callback data or its mutation acknowledgement.
export function createLinearResultWriter({ getAccessToken, readIssue, readRequest, beginWrite, policy,
  fetchImpl = globalThis.fetch, now = () => Date.now(), maxWriteMs = 20_000, signal }) {
  if ([getAccessToken, readIssue, readRequest, beginWrite, fetchImpl, now].some((value) => typeof value !== 'function') ||
      !policy || ['organizationId', 'appUserId', 'teamId', 'projectId'].some((key) =>
        typeof policy[key] !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(policy[key])) ||
      !Number.isSafeInteger(maxWriteMs) || maxWriteMs < 1 || maxWriteMs > 60_000) {
    throw new Error('Linear result writer requires a scoped app policy, trusted readers and bounded transport.');
  }
  policy = structuredClone(policy);
  let attempted = false;
  let busy = false;
  return async ({ task, decision, body } = {}) => {
    if (attempted || busy) return { status: 'blocked', reason: 'result-write-session-consumed' };
    busy = true;
    let startedAt;
    const controller = new AbortController();
    let timer;
    let onAbort;
    let reserved = false;
    const timeout = new Promise((_, reject) => {
      onAbort = () => reject(new Error('Result write canceled or expired.'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const cancel = () => controller.abort();
    timer = setTimeout(cancel, maxWriteMs);
    signal?.addEventListener('abort', cancel, { once: true });
    const bounded = (operation) => Promise.race([operation, timeout]);
    const clock = () => {
      const time = now();
      if (controller.signal.aborted || !Number.isSafeInteger(time) || time < startedAt || time - startedAt > maxWriteMs) {
        throw new Error('Result write observation is stale.');
      }
      return time;
    };
    try {
      if (signal?.aborted) throw new Error('Result write canceled.');
      startedAt = now();
      task = structuredClone(task);
      decision = structuredClone(decision);
      const receipt = task?.planningResult;
      if (!Number.isSafeInteger(startedAt) || startedAt <= 0 || !['create', 'reconcile'].includes(decision?.action) ||
          typeof task?.id !== 'string' || !task.id.trim() || task.id.length > 4096 ||
          !receipt || receipt.status !== 'pending' || receipt.attemptedAt || !isDeepStrictEqual(receipt, decision.receipt) ||
          !UUID.test(receipt.commentId) || receipt.issueId !== task.planning?.binding.issueId ||
          receipt.writerAppUserId !== policy.appUserId || receipt.bodyHash !== linearResultBodyHash(body) ||
          receipt.head !== task.head || receipt.revision !== task.revision ||
          receipt.planningRevision !== task.planning.binding.revision ||
          !Number.isSafeInteger(receipt.intentAt) || receipt.intentAt <= 0 || receipt.intentAt > startedAt ||
          !Number.isSafeInteger(task.dispatch?.intentAt) || task.dispatch.intentAt <= 0 || task.dispatch.intentAt > receipt.intentAt ||
          !task.dispatch?.threadId || !['research', 'audit'].includes(task.mode) ||
          !['verifying', 'awaiting-approval'].includes(task.state) || task.brief?.resultDestination !== 'linear-planning' ||
          task.planning.binding.teamId !== policy.teamId || task.planning.binding.projectId !== policy.projectId) {
        throw new Error('Result write does not match the reserved scope.');
      }
      requirePlanningScope(task, startedAt);
      const token = await bounded(getAccessToken({ signal: controller.signal }));
      if (typeof token !== 'string' || !token.trim() || token.length > 8192 || /[\r\n]/.test(token)) {
        throw new Error('Result write token unavailable.');
      }
      const request = async (query, variables, verifyIdentity = true) => {
        clock();
        const response = await bounded(fetchImpl(ENDPOINT, {
          method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
        }));
        const result = await readLinearResponseJson(response, bounded);
        if (result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) {
          throw new Error('Result write service returned errors.');
        }
        const { organization, viewer } = result.data ?? {};
        if (verifyIdentity && (organization?.id !== policy.organizationId || viewer?.id !== policy.appUserId ||
            viewer.app !== true || viewer.active !== true)) throw new Error('Result write app identity mismatch.');
        clock();
        return result.data;
      };
      const destination = async () => {
        const data = await request(LINEAR_RESULT_DESTINATION_QUERY, { id: receipt.issueId });
        const issue = data.issue;
        if (issue?.id !== receipt.issueId || issue.team?.id !== policy.teamId || issue.project?.id !== policy.projectId ||
            issue.archivedAt !== null || issue.canceledAt !== null || !Array.isArray(issue.syncedWith) || issue.syncedWith.length ||
            typeof issue.updatedAt !== 'string' || !Number.isFinite(Date.parse(issue.updatedAt))) {
          throw new Error('Result write destination is unavailable or externally synced.');
        }
        return issue;
      };
      const first = await destination();
      const scopeStartedAt = clock();
      const observation = await bounded(readIssue(receipt.issueId));
      if (observation?.observedAt < scopeStartedAt ||
          evaluatePlanningObservation(task.planning.binding, observation, clock()).result !== 'pass') {
        throw new Error('Result write proposal changed.');
      }
      if (!isDeepStrictEqual(first, await destination())) throw new Error('Result write destination changed.');
      const identity = { source: task.source, requestId: task.requestId };
      const authorityStartedAt = clock();
      const accepted = validatePlanningRequestObservation(await bounded(readRequest(identity)), identity, authorityStartedAt, clock());
      if (accepted.mode !== task.mode || accepted.revision !== task.revision ||
          !isDeepStrictEqual(accepted.planningBinding, task.planning.binding) || !isDeepStrictEqual(accepted.brief, task.brief) ||
          !isDeepStrictEqual(accepted.resourceLimits, task.resources?.limits) ||
          !isDeepStrictEqual([...new Set([...(accepted.requiredGates ?? []), 'output'])].sort(), [...task.requiredGates].sort()) ||
          accepted.authority.actor !== task.authority.actor || accepted.authority.reference !== task.authority.reference) {
        throw new Error('Result write authority or selected scope changed.');
      }
      clock();
      if (await bounded(getAccessToken({ signal: controller.signal })) !== token) {
        throw new Error('Result write session changed or closed.');
      }
      attempted = true;
      reserved = true;
      // beginWrite records the fresh planning observation, then atomically reserves the only
      // send under the current coordinator lease. An uncertain acknowledgement is reconciled.
      const permit = await bounded(beginWrite({ taskId: task.id, commentId: receipt.commentId,
        authority: accepted.authority, observation }));
      if (permit?.action !== 'send' || !Number.isSafeInteger(permit.receipt?.attemptedAt) ||
          permit.receipt.attemptedAt < accepted.authority.observedAt || permit.receipt.attemptedAt > clock() ||
          !isDeepStrictEqual(permit.receipt, { ...receipt, attemptedAt: permit.receipt.attemptedAt })) {
        throw new Error('Result send reservation was not confirmed.');
      }
      if (await bounded(getAccessToken({ signal: controller.signal })) !== token) {
        throw new Error('Result write session changed or closed.');
      }
      const data = await request(LINEAR_RESULT_CREATE_MUTATION, { input: {
        id: receipt.commentId, issueId: receipt.issueId, body,
        createOnSyncedSlackThread: false, doNotSubscribeToIssue: true,
      } }, false);
      const comment = data.commentCreate?.comment;
      if (data.commentCreate?.success !== true || comment?.id !== receipt.commentId || comment.issue?.id !== receipt.issueId ||
          comment.issue.team?.id !== policy.teamId || comment.issue.project?.id !== policy.projectId ||
          comment.user?.id !== policy.appUserId || comment.user.app !== true || comment.user.active !== true) {
        throw new Error('Result write acknowledgement mismatch.');
      }
      return { status: 'acknowledged', commentId: receipt.commentId, observedAt: clock() };
    } catch {
      return { status: reserved ? 'uncertain' : 'blocked', reason: reserved ? 'result-write-requires-reconciliation' : 'result-write-unverified' };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', onAbort);
      controller.abort();
      busy = false;
    }
  };
}
