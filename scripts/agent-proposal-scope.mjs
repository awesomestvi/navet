import { isDeepStrictEqual } from 'node:util';
import { evaluatePlanningObservation, validatePlanningBinding } from './agent-planning-scope.mjs';
import { validatePlanningRequestObservation } from './agent-planning-intake.mjs';

const DISCOVERY_STAGES = new Set(['Captured', 'Developing proposal']);

export function validateProposalDestination(brief, binding) {
  validatePlanningBinding(binding);
  const expected = { kind: 'linear', issueId: binding.issueId, teamId: binding.teamId, projectId: binding.projectId };
  if (brief?.purpose !== 'proposal-development' || brief.visibility !== 'private-planning' ||
      brief.resultDestination !== 'linear-proposal' || !isDeepStrictEqual(brief.destination, expected)) {
    throw new Error('Proposal development requires its exact private Linear destination.');
  }
}

// Reuse complete content, attachment, lifecycle, freshness and stage parsing from the delivery
// contract. Only the two discovery stages confer proposal scope; neither confers implementation.
export function evaluateProposalObservation(binding, observation, now = Date.now()) {
  const result = evaluatePlanningObservation(binding, observation, now);
  if (result.result === 'unverified' || !result.stage) return result;
  return { ...result, result: DISCOVERY_STAGES.has(result.stage) ? 'pass' : 'fail',
    reason: DISCOVERY_STAGES.has(result.stage) ? 'proposal-scope-current' : 'proposal-development-withdrawn' };
}

// readRequest is an installed trusted boundary: it must authenticate the maintainer's idea
// request and permissions. Label, priority, proposal prose and agent comments are not authority.
export function validateProposalRequestObservation(observation, identity, startedAt, now) {
  const original = observation?.request;
  if (original?.planningBinding !== undefined || original?.mode !== 'research' ||
      original?.authority?.kind !== 'maintainer-idea-request' ||
      original.authority.proposalRevision !== original.proposalBinding?.revision) {
    throw new Error('Proposal development requires an exact maintainer idea request for research only.');
  }
  validateProposalDestination(original.brief, original.proposalBinding);
  // Reuse the trusted request's identity, complete work brief and exact revision checks without
  // attaching this private task to the shared public delivery queue's planning binding.
  const validated = validatePlanningRequestObservation({ ...observation, request: { ...original,
    planningBinding: original.proposalBinding,
    authority: { ...original.authority, planningRevision: original.authority.proposalRevision },
  } }, identity, startedAt, now);
  delete validated.planningBinding;
  delete validated.authority.planningRevision;
  return validated;
}

export function proposalRequestMatchesTask(task, request) {
  return request.mode === task.mode && request.revision === task.revision &&
    isDeepStrictEqual(request.proposalBinding, task.proposal?.binding) &&
    isDeepStrictEqual(request.brief, task.brief) &&
    isDeepStrictEqual(request.resourceLimits, task.resources?.limits) &&
    isDeepStrictEqual([...new Set([...(request.requiredGates ?? []), 'output'])].sort(), [...task.requiredGates].sort()) &&
    request.authority.kind === task.authority.kind && request.authority.actor === task.authority.actor &&
    request.authority.reference === task.authority.reference &&
    request.authority.proposalRevision === task.proposal?.binding.revision;
}

export function requireProposalScope(task, now = Date.now()) {
  if (!task.proposal) return;
  if (task.planning || task.mode !== 'research' || task.authority?.kind !== 'maintainer-idea-request' ||
      task.authority.proposalRevision !== task.proposal.binding.revision) {
    throw new Error('Proposal scope cannot authorize implementation or shared delivery.');
  }
  validateProposalDestination(task.brief, task.proposal.binding);
  if (task.requestRevocation || task.proposal.revokedAt) throw new Error('Proposal authority was withdrawn.');
  if (task.workerStop && task.workerStop.status !== 'stopped') throw new Error('Proposal worker stop is unverified.');
  const observation = task.proposal.observation;
  if (!Number.isSafeInteger(now) || now <= 0 || !Number.isSafeInteger(observation?.observedAt) ||
      observation.observedAt <= 0 || observation.observedAt > now || observation.observedAt < now - 60_000) {
    throw new Error('Proposal scope observation is stale.');
  }
  if (observation.result !== 'pass' || !DISCOVERY_STAGES.has(observation.stage) ||
      observation.revision !== task.proposal.binding.revision) {
    throw new Error(`Proposal scope blocks execution: ${observation.reason ?? 'proposal-scope-unverified'}.`);
  }
}

export async function enqueueProposalRequest({ store, identity, readRequest, readIssue, now = () => Date.now() }) {
  if (!store || typeof store.enqueue !== 'function' || [readRequest, readIssue, now].some((value) => typeof value !== 'function')) {
    throw new Error('Proposal intake requires durable ownership and trusted service readers.');
  }
  const clock = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid proposal intake clock.');
    return value;
  };
  const startedAt = clock();
  const initial = validateProposalRequestObservation(await readRequest({ ...identity }), identity, startedAt, clock());
  const issueStartedAt = clock();
  const observation = await readIssue(initial.proposalBinding.issueId);
  if (!Number.isSafeInteger(observation?.observedAt) || observation.observedAt < issueStartedAt) {
    throw new Error('Proposal intake requires a fresh owning-service read.');
  }
  const scope = evaluateProposalObservation(initial.proposalBinding, observation, clock());
  if (scope.result !== 'pass') throw new Error(`Proposal intake blocked: ${scope.reason}.`);
  const authorityStartedAt = clock();
  const current = validateProposalRequestObservation(await readRequest({ ...identity }), identity, authorityStartedAt, clock());
  const accepted = (request) => {
    const copy = structuredClone(request);
    delete copy.authority.observedAt;
    return copy;
  };
  if (!isDeepStrictEqual(accepted(initial), accepted(current))) throw new Error('Idea request changed during proposal intake.');
  const finishedAt = clock();
  if (finishedAt < startedAt || finishedAt - startedAt > 60_000) throw new Error('Proposal intake exceeded its fresh-read window.');
  // An intake read cannot substitute for a fresh check at specialist execution or publication.
  return store.enqueue(current);
}
