import { resumeTeamWorker } from './agent-team-resume.mjs';
import { monitorTeamWorker } from './agent-team-monitor.mjs';
import { teamAssignmentComplete } from './agent-team-state.mjs';
import { validatePlanningRequestObservation, planningRequestMatchesTask } from './agent-planning-intake.mjs';
import { validateProposalRequestObservation, proposalRequestMatchesTask } from './agent-proposal-scope.mjs';

// Installed adapters own authentication, runtime permissions and actual evidence. One call
// advances at most one specialist; no timer, scheduler, new resource policy or model is installed.
export async function runTeamStep({ store, owner, taskId, adapters, resourceToken, now = Date.now,
  maxRunMs = 30_000, signal }) {
  const required = ['readIssue', 'readRequest', 'createWorker', 'findWorker', 'readWorker'];
  if (!store || !owner || !taskId || required.some((key) => typeof adapters?.[key] !== 'function') ||
      !Number.isSafeInteger(maxRunMs) || maxRunMs < 1 || maxRunMs > 60_000) throw new Error('Team configuration unavailable.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, maxRunMs);
  let rejectAbort;
  const canceled = new Promise((_, reject) => { rejectAbort = reject; });
  void canceled.catch(() => {});
  controller.signal.addEventListener('abort', () => rejectAbort(new Error('Team observation canceled.')), { once: true });
  const started = now();
  const clock = () => {
    const time = now();
    if (controller.signal.aborted || !Number.isSafeInteger(time) || started <= 0 || time < started ||
        time - started >= maxRunMs) throw new Error('Team observation expired.');
    return time;
  };
  const remote = async (operation) => { clock(); const result = await Promise.race([operation(), canceled]); clock(); return result; };
  const current = async () => {
    const task = (await store.list()).find((item) => item.id === taskId);
    if (!task || task.lease?.owner !== owner || task.lease.expiresAt <= clock() ||
        ['delivered', 'terminal-failure'].includes(task.state)) throw new Error('Team ownership unavailable.');
    return task;
  };
  const event = (input, authority) => store.mutate(taskId, 'team-event', { owner, event: input, authority, resourceToken });
  try {
    let task = await current();
    if (!task.team?.plan) return { status: 'blocked', reason: 'team-plan-required' };
    if (task.team.status === 'awaiting-input') {
      const active = task.team.workers.find((worker) => worker.workerId && ['running', 'uncertain'].includes(worker.status));
      if (active) return await monitorTeamWorker({ store, owner, taskId, intentId: active.intentId, adapters, maxStopAttempts: adapters.maxStopAttempts, now, maxRunMs, signal: controller.signal });
      return { status: 'awaiting-input' };
    }
    if (['awaiting-review', 'accepted'].includes(task.team.status)) return { status: task.team.status };
    const assignments = task.team.plan.assignments;
    for (const assignment of assignments) {
      const worker = task.team.workers.find((item) => item.assignmentId === assignment.id && item.planRevision === task.team.plan.revision);
      if (teamAssignmentComplete(task, assignment.id)) continue;
      if (worker?.status === 'stopped' && worker.stop?.reason === 'awaiting-input') {
        const answered = task.team.questions.findLast((question) => question.answer && worker.stop.questionIds?.includes(question.questionId) && question.answer.observedAt >= worker.stop.intentAt);
        if (answered) return await resumeTeamWorker({ store, owner, taskId, intentId: worker.intentId, questionId: answered.questionId, adapters, resourceToken, now, maxRunMs, signal: controller.signal });
      }
      if (worker && ['completed', 'failed', 'missing', 'stopped'].includes(worker.status)) return { status: 'blocked', reason: 'team-replan-required' };
      if (worker?.attemptedAt && !worker.workerId) {
        const observedAfter = clock();
        const found = await remote(() => adapters.findWorker({ taskId, intentId: worker.intentId }, { signal: controller.signal }));
        if (found?.status !== 'found' || found.taskId !== taskId || found.intentId !== worker.intentId ||
            !found.reference || found.observedAt < observedAfter || found.observedAt > clock()) return { status: 'pending', reason: 'worker-create-unverified' };
        await event({ eventId: `bind:${worker.intentId}`, type: 'worker-bind', intentId: worker.intentId, workerId: found.workerId });
        return { status: 'bound', workerId: found.workerId };
      }
      if (worker?.workerId) {
        const observedAfter = clock();
        const observation = await remote(() => adapters.readWorker({ taskId, intentId: worker.intentId, workerId: worker.workerId }, { signal: controller.signal }));
        if (observation?.taskId !== taskId || observation.intentId !== worker.intentId ||
            observation.observedAt < observedAfter || observation.observedAt > clock()) return { status: 'pending', reason: 'worker-read-unverified' };
        if (observation.status === 'running' || worker.stop) return await monitorTeamWorker({ store, owner, taskId, intentId: worker.intentId, adapters, maxStopAttempts: adapters.maxStopAttempts, now, maxRunMs, signal: controller.signal });
        if (observation.status === 'completed' && task.context) {
          if (typeof adapters.readCheckpoint !== 'function' || !observation.runId) return { status: 'blocked', reason: 'team-checkpoint-reader-required' };
          const checkpointStarted = clock();
          const checkpoint = await remote(() => adapters.readCheckpoint({ taskId, intentId: worker.intentId, workerId: worker.workerId, runId: observation.runId }, { signal: controller.signal }));
          if (checkpoint?.status !== 'verified' || checkpoint.observedAt < checkpointStarted || checkpoint.observedAt > clock()) return { status: 'pending', reason: 'team-checkpoint-unverified' };
          await store.mutate(taskId, 'team-checkpoint', { owner, checkpoint });
          observation.stateHash = checkpoint.stateHash;
          // Evidence must be for the actual captured state, never a worker's old head claim.
          task = await current();
        }
        await event({ eventId: `observe:${worker.intentId}:${observation.reference}:${observation.observedAt}`,
          type: 'worker-observation', intentId: worker.intentId, observation, evidence: observation.evidence ?? [] });
        return { status: observation.status, workerId: worker.workerId };
      }
      if (!assignment.dependsOn.every((id) => teamAssignmentComplete(task, id))) continue;
      // Each new execution reads current proposal first, then freshly verifies its exact
      // human request. Priority, webhook actor and agent-written stages grant no authority.
      const binding = task.proposal?.binding ?? task.planning?.binding;
      if (!binding) throw new Error('Team planning binding required.');
      const observedAfter = clock();
      let observation;
      try {
        observation = await remote(() => adapters.readIssue(binding.issueId, { signal: controller.signal }));
        if (observation.observedAt < observedAfter || observation.observedAt > clock()) throw new Error('Stale team scope.');
      } catch {
        await store.mutate(taskId, task.proposal ? 'proposal-observation' : 'planning-observation', { owner,
          observation: { status: 'unavailable', reference: 'team-scope-unavailable', observedAt: now() } });
        throw new Error('Team scope unavailable.');
      }
      await store.mutate(taskId, task.proposal ? 'proposal-observation' : 'planning-observation', { owner, observation });
      const requestStarted = clock();
      const identity = { source: task.source, requestId: task.requestId };
      const requestObservation = await remote(() => adapters.readRequest(identity, { signal: controller.signal }));
      if (requestObservation?.status === 'withdrawn') await store.mutate(taskId, 'request-revocation', { owner,
        observation: { ...identity, status: 'withdrawn', reference: task.authority.reference, observedAt: clock() } });
      const validate = task.proposal ? validateProposalRequestObservation : validatePlanningRequestObservation;
      const match = task.proposal ? proposalRequestMatchesTask : planningRequestMatchesTask;
      const request = validate(requestObservation, identity, requestStarted, clock());
      if (!match(task, request)) throw new Error('Accepted team scope changed.');
      const intentId = worker?.intentId ?? `${taskId}:${assignment.id}:${task.team.plan.revision}`;
      await event({ eventId: `intent:${intentId}`, type: 'worker-intent', assignmentId: assignment.id, intentId }, request.authority);
      task = await current();
      const attempt = await event({ eventId: `attempt:${intentId}`, type: 'worker-attempt', intentId }, request.authority);
      // An immutable event replay must never turn a durable attempted send into permission.
      if (attempt.teamDecision?.action !== 'send') return { status: 'pending' };
      clock();
      const handle = await remote(() => adapters.createWorker({ taskId, intentId, assignment: structuredClone(assignment),
        mode: task.mode, revision: task.revision, brief: structuredClone(task.brief),
        priorEvidence: task.team.workers.filter((item) => item.planRevision === task.team.plan.revision && assignment.dependsOn.includes(item.assignmentId))
          .map((item) => ({ assignmentId: item.assignmentId, evidence: item.evidence })) }, { signal: controller.signal }));
      await event({ eventId: `bind:${intentId}`, type: 'worker-bind', intentId, workerId: handle.workerId });
      return { status: 'bound', workerId: handle.workerId };
    }
    return { status: 'evidence-ready' };
  } catch {
    return { status: 'pending', reason: 'team-step-unverified' };
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel); controller.abort();
  }
}
