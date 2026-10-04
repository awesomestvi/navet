import { isDeepStrictEqual } from 'node:util';
import { evaluatePlanningObservation, validatePlanningBinding } from './agent-planning-scope.mjs';

function clock(now) {
  const value = now();
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid planning intake clock.');
  return value;
}

export function planningRequestMatchesTask(task, request) {
  return request.mode === task.mode && request.revision === task.revision &&
    isDeepStrictEqual(request.planningBinding, task.planning?.binding) && isDeepStrictEqual(request.brief, task.brief) &&
    isDeepStrictEqual(request.resourceLimits, task.resources?.limits) &&
    isDeepStrictEqual([...new Set([...(request.requiredGates ?? []), 'output'])].sort(), [...task.requiredGates].sort()) &&
    request.authority.actor === task.authority.actor && request.authority.reference === task.authority.reference;
}

export function validatePlanningRequestObservation(observation, identity, startedAt, now) {
  if (!identity || ['source', 'requestId'].some((key) => typeof identity[key] !== 'string' ||
      !identity[key].trim() || identity[key].length > 4096) ||
      !Number.isSafeInteger(startedAt) || startedAt <= 0 || !Number.isSafeInteger(now) ||
      now < startedAt || now - startedAt > 60_000) {
    throw new Error('Trusted request validation requires an exact identity and fresh read window.');
  }
  if (observation?.status !== 'authorized') throw new Error('Trusted request is not authorized.');
  const request = structuredClone(observation.request);
  if (!request || request.source !== identity.source || request.requestId !== identity.requestId) {
    throw new Error('Trusted request identity mismatch.');
  }
  validatePlanningBinding(request.planningBinding);
  const brief = request.brief;
  const scopedText = (value) => typeof value === 'string' && value.trim() && value.length <= 4096;
  if (!brief || !scopedText(brief.selectedOption) || !Array.isArray(brief.permittedChanges) ||
      !brief.permittedChanges.length || !brief.permittedChanges.every(scopedText) ||
      !['private-planning', 'public-delivery-approved'].includes(brief.visibility) ||
      !Array.isArray(brief.acceptanceCriteria) || !brief.acceptanceCriteria.length ||
      !brief.acceptanceCriteria.every(scopedText)) {
    throw new Error('Trusted work brief requires a selected option, permitted changes, visibility and acceptance criteria.');
  }
  if (['implement', 'steward'].includes(request.mode) && brief.visibility !== 'public-delivery-approved') {
    throw new Error('Public delivery requires explicit visibility approval for implementation or stewardship.');
  }
  const authority = request.authority;
  if (!authority || typeof authority.actor !== 'string' || !authority.actor.trim() ||
      typeof authority.reference !== 'string' || !authority.reference.trim() ||
      authority.planningRevision !== request.planningBinding.revision ||
      authority.revision !== request.revision || !Number.isSafeInteger(authority.observedAt) ||
      authority.observedAt < startedAt || authority.observedAt > now || now - authority.observedAt > 60_000) {
    throw new Error('Trusted request requires fresh authority for the exact accepted scope.');
  }
  return request;
}

// readRequest must verify the human request and its current permissions through the owning
// trusted source, not interpret proposal text, webhook actor IDs or an Approved label.
// readIssue must fetch a complete fresh Linear issue, including attachments and lifecycle.
// These adapters form the trust boundary; this helper does not authenticate their responses.
// No claim, dispatch, service mutation, or public artifact is produced here. Queued work still
// needs fresh planning and authority observations at the existing execution gates.
export async function enqueuePlanningRequest({ store, identity, readRequest, readIssue, now = () => Date.now() }) {
  if (!store || typeof store.enqueue !== 'function' || typeof readRequest !== 'function' ||
      typeof readIssue !== 'function' || !identity ||
      ['source', 'requestId'].some((key) => typeof identity[key] !== 'string' || !identity[key].trim())) {
    throw new Error('Planning intake requires a store, request identity and trusted service readers.');
  }
  const startedAt = clock(now);
  const initial = validatePlanningRequestObservation(await readRequest({ ...identity }), identity, startedAt, clock(now));
  const planningStartedAt = clock(now);
  const observation = await readIssue(initial.planningBinding.issueId);
  const planningFinishedAt = clock(now);
  if (planningFinishedAt < planningStartedAt || !Number.isSafeInteger(observation?.observedAt) ||
      observation.observedAt < planningStartedAt) throw new Error('Planning intake requires a fresh service read.');
  const scope = evaluatePlanningObservation(initial.planningBinding, observation, planningFinishedAt);
  if (scope.result !== 'pass') throw new Error(`Planning intake blocked: ${scope.reason}.`);
  // Re-read authority after the planning request, so withdrawal or scope edits during that
  // read cannot enqueue the old approval. No local timestamp can renew a cached approval.
  const approvalStartedAt = clock(now);
  const current = validatePlanningRequestObservation(await readRequest({ ...identity }), identity, approvalStartedAt, clock(now));
  const withoutObservationTime = (request) => {
    const copy = structuredClone(request);
    delete copy.authority.observedAt;
    return copy;
  };
  if (!isDeepStrictEqual(withoutObservationTime(initial), withoutObservationTime(current))) {
    throw new Error('Trusted request changed during planning intake.');
  }
  const finishedAt = clock(now);
  if (finishedAt < startedAt || finishedAt - startedAt > 60_000) {
    throw new Error('Planning intake exceeded its fresh-read window.');
  }
  // Keep the queue's planning observation empty: another live read is required before work.
  return store.enqueue(current);
}
