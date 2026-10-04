import { createTeamOperation } from './agent-team-operation.mjs';
import { teamPlanComplete } from './agent-team-state.mjs';
import { validatePlanningRequestObservation, planningRequestMatchesTask } from './agent-planning-intake.mjs';
import { validateProposalRequestObservation, proposalRequestMatchesTask } from './agent-proposal-scope.mjs';
import { createTeamTicketUpdate, createTeamTicketAdapter } from './agent-team-ticket.mjs';

// The caller supplies installed service callbacks and an existing lease. Persist publication
// attempts in the same store as specialist ownership, including across adapter restarts.
export async function runTeamTicketUpdate({ store, owner, taskId, kind, body, stage, questionId,
  policy, adapters, resourceToken, now = Date.now, signal }) {
  const task = (await store.list()).find((item) => item.id === taskId);
  const binding = task?.proposal?.binding ?? task?.planning?.binding;
  if (!binding || task.lease?.owner !== owner || task.lease.expiresAt <= now()) throw new Error('Owned ticket scope required.');
  if (kind === 'pr-evidence' && (!task.team?.pr || task.team.pr.head !== task.head || !teamPlanComplete(task))) throw new Error('PR ticket evidence requires current independently reviewed delivery.');
  if (kind === 'stage' && stage === 'Ready for prioritization' && (!task.team?.proposal || !teamPlanComplete(task))) throw new Error('Ready proposal requires integrated evidence.');
  if (kind === 'stage' && stage === 'Validated' && (!task.team?.acceptance || task.team.acceptance.head !== task.head || !teamPlanComplete(task))) throw new Error('Validated requires current maintainer acceptance.');
  const event = (input, authority) => store.mutate(taskId, 'team-event', { owner, event: input, authority, resourceToken });
  const intended = createTeamTicketUpdate({ taskId, issueId: binding.issueId, scopeRevision: binding.revision,
    kind, body, stage, questionId, taskRevision: task.revision, planRevision: task.team?.plan?.revision ?? null, deliveryHead: task.head, intentAt: now(), writerAppUserId: policy.writerAppUserId });
  if (kind === 'question' && !task.team?.questions?.some((item) => item.questionId === questionId)) {
    await event({ eventId: `question-intent:${intended.updateId}`, type: 'question', questionId, text: body,
      reference: `ticket-update-intent:${intended.updateId}`, observedAt: now() });
  }
  let update = task.team?.updates?.find((item) => item.updateId === intended.updateId);
  if (!update) {
    await event({ eventId: `ticket-intent:${intended.updateId}`, type: 'ticket-intent', receipt: intended });
    update = { receipt: intended, status: 'pending' };
  }
  const adapter = createTeamTicketAdapter({ policy, ...adapters, now, signal,
    beginAttempt: async ({ receipt, authority }, { signal: operationSignal }) => {
      if (operationSignal.aborted) throw new Error('Ticket operation canceled.');
      // The ticket adapter verifies its service authority; the store also checks the accepted
      // actor and revision. Installed mappings never derive authority from ticket prose.
      if (authority.actorId !== task.authority.actor) throw new Error('Ticket authority actor changed.');
      const startedAt = now();
      const scope = await adapters.readIssue(binding.issueId, { signal: operationSignal });
      if (scope.observedAt < startedAt) throw new Error('Ticket scope read is stale.');
      await store.mutate(taskId, task.proposal ? 'proposal-observation' : 'planning-observation', { owner, observation: scope });
      const requestStarted = now();
      const identity = { source: task.source, requestId: task.requestId };
      const validate = task.proposal ? validateProposalRequestObservation : validatePlanningRequestObservation;
      const match = task.proposal ? proposalRequestMatchesTask : planningRequestMatchesTask;
      const request = validate(await adapters.readRequest(identity, { signal: operationSignal }), identity, requestStarted, now());
      if (!match(task, request)) throw new Error('Ticket accepted scope changed.');
      if (operationSignal.aborted) throw new Error('Ticket operation canceled.');
      const latest = (await store.list()).find((item) => item.id === taskId);
      if (latest.head !== receipt.deliveryHead || latest.revision !== receipt.taskRevision || (latest.team?.plan?.revision ?? null) !== receipt.planRevision) throw new Error('Ticket snapshot changed.');
      const saved = await event({ eventId: `ticket-attempt:${receipt.updateId}`, type: 'ticket-attempt', updateId: receipt.updateId }, request.authority);
      return { action: saved.teamDecision.action,
        receipt: saved.team.updates.find((item) => item.updateId === receipt.updateId).receipt };
    } });
  const result = await adapter.deliver({ receipt: update.receipt, body });
  if (result.status !== 'verified') return result;
  const observation = { ...result.observation, status: 'verified' };
  await event({ eventId: `ticket-observed:${intended.updateId}:${observation.observedAt}`, type: 'ticket-observation', updateId: intended.updateId, observation });
  if (kind === 'question') {
    const current = (await store.list()).find((item) => item.id === taskId);
    if (!current.team.questions.some((item) => item.questionId === questionId)) await event({
      eventId: `question:${intended.updateId}`, type: 'question', questionId, text: body,
      reference: observation.url, observedAt: observation.observedAt });
  }
  return { status: 'verified', updateId: intended.updateId, reference: observation.url };
}

export async function resumeTeamTicketAnswer({ store, owner, taskId, updateId, answerId, policy, adapters, now = Date.now, maxRunMs = 30_000, signal }) {
  const operation = createTeamOperation({ now, maxRunMs, signal });
  try {
    const task = (await store.list()).find((item) => item.id === taskId);
    operation.clock();
    const update = task?.team?.updates?.find((item) => item.updateId === updateId);
    if (task?.team?.events?.some((event) => event.eventId === `answer:${answerId}`)) return { status: 'resumed', taskId };
    if (!update || update.status !== 'verified') return { status: 'blocked', reason: 'question-readback-required' };
    const adapter = createTeamTicketAdapter({ policy, ...adapters, now, signal: operation.signal,
      beginAttempt: async () => { throw new Error('Answer observation cannot publish.'); } });
    const result = await operation.remote(() => adapter.acceptAnswer({ receipt: { ...update.receipt, status: 'verified' }, answerId }));
    if (result.status !== 'accepted') return result;
    const binding = task.proposal?.binding ?? task.planning?.binding;
    const scopeStarted = operation.clock();
    const scope = await operation.remote((signal) => adapters.readIssue(binding.issueId, { signal }));
    if (scope.observedAt < scopeStarted || scope.observedAt > operation.clock()) throw new Error('Answer scope observation stale.');
    await store.mutate(taskId, task.proposal ? 'proposal-observation' : 'planning-observation', { owner, observation: scope });
    const requestStarted = operation.clock();
    const identity = { source: task.source, requestId: task.requestId };
    const validate = task.proposal ? validateProposalRequestObservation : validatePlanningRequestObservation;
    const match = task.proposal ? proposalRequestMatchesTask : planningRequestMatchesTask;
    const request = validate(await operation.remote((signal) => adapters.readRequest(identity, { signal })), identity, requestStarted, operation.clock());
    if (!match(task, request)) throw new Error('Answer authority changed.');
    operation.clock();
    await store.mutate(taskId, 'team-event', { owner, event: { eventId: `answer:${answerId}`, type: 'answer',
      questionId: update.receipt.questionId, answer: { actor: result.answer.actorId, text: result.answer.text,
        reference: result.answer.reference, observedAt: result.answer.observedAt, verified: true,
        planningRevision: result.answer.scopeRevision } } });
    return { status: 'resumed', taskId };
  } catch { return { status: 'pending', taskId, reason: 'ticket-answer-unverified' }; }
  finally { operation.close(); }
}
