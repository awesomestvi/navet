import { isDeepStrictEqual } from 'node:util';
import { validatePlanningRequestObservation, planningRequestMatchesTask } from './agent-planning-intake.mjs';
import { validateProposalRequestObservation, proposalRequestMatchesTask } from './agent-proposal-scope.mjs';
import { createTeamOperation } from './agent-team-operation.mjs';
import { teamTicketReadbackMatches } from './agent-team-ticket.mjs';
import { runTeamAccounting } from './agent-team-accounting.mjs';
import { requireTeamCompletionScope } from './agent-team-state.mjs';

const completionSnapshot = (task) => ({ source: task.source, requestId: task.requestId, mode: task.mode,
  revision: task.revision, head: task.head, context: task.context, team: task.team,
  planningBinding: task.planning?.binding, proposalBinding: task.proposal?.binding,
  actor: task.authority?.actor, authorityReference: task.authority?.reference });

// Completing a local task releases ownership only after exact artifact/stage readback and
// whole-team native accounting. It does not confer product, merge or release authority.
export async function completeTeamTask({ store, owner, taskId, outputUpdateId, stageUpdateId, policy, adapters,
  now = Date.now, maxRunMs = 30_000, signal }) {
  const operation = createTeamOperation({ now, maxRunMs, signal });
  try {
    let task = (await store.list()).find((item) => item.id === taskId);
    operation.clock();
    if (task?.state === 'delivered' && task.team?.completion?.outputUpdateId === outputUpdateId && task.team.completion.stageUpdateId === stageUpdateId) return { status: 'delivered', taskId };
    if (!task?.team?.plan || task.lease?.owner !== owner || policy?.readerAppUserId === policy?.writerAppUserId) throw new Error('Exact owned team output required.');
    for (const updateId of [outputUpdateId, stageUpdateId]) {
      const update = task.team.updates.find((item) => item.updateId === updateId);
      if (!update || update.status !== 'verified') throw new Error('Artifact receipt unverified.');
      const startedAt = operation.clock();
      const observation = await operation.remote((signal) => adapters.readUpdate(update.receipt, { signal }));
      if (!teamTicketReadbackMatches(policy, observation, update.receipt, startedAt, operation.clock())) throw new Error('Current ticket readback unavailable.');
      await store.mutate(taskId, 'team-event', { owner, event: { eventId: `completion-readback:${updateId}:${observation.observedAt}`,
        type: 'ticket-observation', updateId, observation: { ...observation, status: 'verified' } } });
    }
    task = (await store.list()).find((item) => item.id === taskId);
    operation.clock();
    if (!task || task.lease?.owner !== owner || task.lease.expiresAt <= operation.clock()) throw new Error('Completion ownership changed.');
    const snapshot = completionSnapshot(task);
    const binding = task.proposal?.binding ?? task.planning?.binding;
    const scopeStarted = operation.clock();
    const scopeObservation = await operation.remote((signal) => adapters.readIssue(binding.issueId, { signal }));
    if (!Number.isSafeInteger(scopeObservation?.observedAt) || scopeObservation.observedAt < scopeStarted) {
      throw new Error('Completion requires a fresh issue scope read.');
    }
    requireTeamCompletionScope(task, scopeObservation, operation.clock());
    const requestStarted = operation.clock();
    const identity = { source: task.source, requestId: task.requestId };
    const observed = await operation.remote((signal) => adapters.readRequest(identity, { signal }));
    if (observed?.status === 'withdrawn') await store.mutate(taskId, 'request-revocation', { owner, observation: {
      ...identity, status: 'withdrawn', reference: task.authority.reference, observedAt: operation.clock(),
    } });
    const validate = task.proposal ? validateProposalRequestObservation : validatePlanningRequestObservation;
    const matches = task.proposal ? proposalRequestMatchesTask : planningRequestMatchesTask;
    const request = validate(observed, identity, requestStarted, operation.clock());
    if (!matches(task, request)) throw new Error('Completion accepted request changed.');
    // Meter after scope and authority reads so final whole-team usage includes both.
    const accounting = await runTeamAccounting({ store, owner, taskId, adapters, now, maxRunMs, signal: operation.signal });
    if (accounting.status !== 'verified') return accounting;
    operation.clock();
    const latest = (await store.list()).find((item) => item.id === taskId);
    if (!latest || latest.lease?.owner !== owner || latest.lease.expiresAt <= operation.clock() ||
        !isDeepStrictEqual(snapshot, completionSnapshot(latest)) || !matches(latest, request) || latest.requestRevocation) {
      throw new Error('Completion snapshot changed during final verification.');
    }
    await store.mutate(taskId, 'team-event', { owner, event: { eventId: `finish:${outputUpdateId}:${stageUpdateId}`, type: 'finish', outputUpdateId, stageUpdateId, scopeObservation } });
    return { status: 'delivered', taskId };
  } catch { return { status: 'pending', taskId, reason: 'team-completion-unverified' }; }
  finally { operation.close(); }
}
