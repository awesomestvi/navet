import { expect, it } from 'vitest';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { resumeTeamWorker, teamResumeId } from './agent-team-resume.mjs';

function setup() {
  let time = 1_700_000_000_000; const now = () => time; const tick = () => ++time;
  const issue = { uuid: 'proposal', teamId: 'team', projectId: 'project', title: 'Scope', description: 'Approved work',
    attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'human', requestId: 'decision', mode: 'implement', revision: 'scope', planningBinding: binding,
    authority: { actor: 'maintainer', reference: 'decision', revision: 'scope', planningRevision: binding.revision, observedAt: time },
    brief: { selectedOption: 'Accepted change', permittedChanges: ['Bounded work'], acceptanceCriteria: ['Verified result'], visibility: 'public-delivery-approved' } };
  const checkpoint = { reference: 'saved-checkpoint', head: 'head', nextAction: 'Use the maintainer answer' };
  const task = { id: 'task', state: 'queued', head: 'head', revision: 'scope', ...request, lease: { owner: 'coordinator', expiresAt: time + 100_000 },
    planning: { binding }, requiredGates: ['output'], team: { plan: { revision: 'plan' }, workers: [{ intentId: 'intent', workerId: 'worker', planRevision: 'plan',
      status: 'stopped', checkpoint: structuredClone(checkpoint), observation: { runId: 'old-run' }, stop: { runId: 'old-run', status: 'stopped', reason: 'awaiting-input', questionIds: ['question'], intentAt: time - 10 } }],
    questions: [{ questionId: 'question', answer: { actor: 'maintainer', reference: 'human-answer', text: 'Clarified criteria', observedAt: time, verified: true } }] } };
  task.id = 'task'; task.state = 'queued';
  const calls = []; const events = []; let resumed = false;
  const worker = () => task.team.workers[0];
  const store = { list: async () => [structuredClone(task)], mutate: async (id, action, input) => {
    if (action === 'planning-observation') return structuredClone(task);
    if (action === 'request-revocation') { task.requestRevocation = input.observation; return structuredClone(task); }
    const event = input.event;
    if (events.some((item) => item.eventId === event.eventId)) return { ...structuredClone(task), teamDecision: { action: 'reconcile' } };
    let decision = 'recorded';
    if (event.type === 'worker-resume-intent') {
      worker().resumes ??= []; worker().resumes.push({ resumeId: event.resumeId, questionId: event.questionId,
        answerReference: event.answerReference, previousRunId: event.worker.runId, checkpoint: event.worker.checkpoint, status: 'reserved' });
    } else if (event.type === 'worker-resume-attempt') {
      const resume = worker().resumes.find((item) => item.resumeId === event.resumeId);
      if (resume.attemptedAt) decision = 'reconcile';
      else { resume.attemptedAt = tick(); resume.status = 'uncertain'; decision = 'send'; }
    } else if (event.type === 'worker-resume-bind') {
      const resume = worker().resumes.find((item) => item.resumeId === event.resumeId);
      resume.status = 'running'; resume.runId = event.observation.runId;
      worker().status = 'running'; worker().observation = event.observation; delete worker().stop;
    } else throw new Error('Unknown reducer event.');
    events.push(structuredClone(event));
    return { ...structuredClone(task), teamDecision: { action: decision } };
  } };
  const adapters = {
    readIssue: async () => ({ status: 'available', reference: 'linear:scope', issue, observedAt: tick() }),
    readRequest: async () => ({ status: 'authorized', request: { ...structuredClone(request), authority: { ...request.authority, observedAt: tick() } } }),
    readWorker: async (identity) => ({ ...identity, status: resumed ? 'running' : 'stopped', runId: resumed ? 'new-run' : 'old-run',
      reference: 'runtime:worker', observedAt: tick(), ...(resumed ? {} : { checkpoint: structuredClone(checkpoint) }) }),
    resumeWorker: async (identity) => { calls.push(identity); resumed = true; },
    findResume: async (identity) => ({ ...identity, status: resumed ? 'found' : 'absent', runId: 'new-run', reference: 'runtime:resume', observedAt: tick() }),
  };
  return { task, events, calls, adapters, now, tick, options: { store, owner: 'coordinator', taskId: 'task', intentId: 'intent', questionId: 'question',
    adapters, resourceToken: 'resume-reservation', now }, resumed: () => { resumed = true; } };
}
it('resumes the existing stopped worker from the exact checkpoint and human answer once', async () => {
  const h = setup();
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'resumed', workerId: 'worker', runId: 'new-run' });
  expect(h.calls).toHaveLength(1); expect(h.calls[0]).toMatchObject({ workerId: 'worker', previousRunId: 'old-run',
    answer: { reference: 'human-answer' }, checkpoint: { reference: 'saved-checkpoint' } });
  expect(h.events.map((item) => item.type)).toEqual(['worker-resume-intent', 'worker-resume-attempt', 'worker-resume-bind']);
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'resumed' }); expect(h.calls).toHaveLength(1);
});
it('reconciles a timed-out resume by its durable identity without another send', async () => {
  const h = setup(); const resumeWorker = h.adapters.resumeWorker;
  h.adapters.resumeWorker = async (identity) => { await resumeWorker(identity); throw new Error('Lost response.'); };
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'pending' });
  expect(h.task.team.workers[0].resumes[0].status).toBe('uncertain');
  const restarted = { ...h.options, store: { ...h.options.store } };
  expect(await resumeTeamWorker(restarted)).toMatchObject({ status: 'resumed', runId: 'new-run' }); expect(h.calls).toHaveLength(1);
});
it('confirmed absence after an attempted resume never permits a resend', async () => {
  const h = setup(); h.adapters.resumeWorker = async (identity) => { h.calls.push(identity); throw new Error('Uncertain outcome.'); };
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'pending' });
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'pending', reason: 'team-resume-reconciliation-required' });
  expect(h.calls).toHaveLength(1);
});
it.each(['wrong-run', 'wrong-worker', 'wrong-resume'])('rejects %s readback of a resumed incarnation', async (kind) => {
  const h = setup(); const readWorker = h.adapters.readWorker;
  h.adapters.readWorker = async (identity) => {
    const result = await readWorker(identity);
    if (identity.resumeId) {
      if (kind === 'wrong-run') result.runId = 'old-run';
      if (kind === 'wrong-worker') result.workerId = 'other';
      if (kind === 'wrong-resume') result.resumeId = 'other';
    }
    return result;
  };
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'pending' });
  expect(h.task.team.workers[0].status).toBe('stopped'); expect(h.calls).toHaveLength(1);
});
it.each(['unanswered', 'checkpoint-change', 'scope-change', 'foreign-lease', 'active-worker', 'unrelated-stop', 'stale-answer', 'unrelated-question'])('blocks %s before resume send', async (kind) => {
  const h = setup();
  if (kind === 'unanswered') h.task.team.questions[0].answer = undefined;
  if (kind === 'checkpoint-change') h.task.team.workers[0].checkpoint.reference = 'changed';
  if (kind === 'scope-change') h.adapters.readRequest = async () => ({ status: 'withdrawn' });
  if (kind === 'foreign-lease') h.task.lease.owner = 'foreign';
  if (kind === 'active-worker') h.task.team.workers[0].status = 'running';
  if (kind === 'unrelated-stop') h.task.team.workers[0].stop.reason = 'resource-exhausted';
  if (kind === 'stale-answer') h.task.team.questions[0].answer.observedAt = h.task.team.workers[0].stop.intentAt - 1;
  if (kind === 'unrelated-question') h.task.team.workers[0].stop.questionIds = ['other'];
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: expect.stringMatching(/blocked|pending/) }); expect(h.calls).toHaveLength(0);
});
it('bounds stalled observation and pre-cancellation without sending a resume', async () => {
  const h = setup(); const controller = new AbortController(); controller.abort();
  expect(await resumeTeamWorker({ ...h.options, signal: controller.signal })).toMatchObject({ status: 'pending' });
  h.adapters.readIssue = async () => new Promise(() => {});
  expect(await resumeTeamWorker({ ...h.options, maxRunMs: 20 })).toMatchObject({ status: 'pending' }); expect(h.calls).toHaveLength(0);
});
it('binds resume identity to the accepted answer rather than the clock', () => {
  expect(teamResumeId('intent', 'question', 'answer')).toBe(teamResumeId('intent', 'question', 'answer'));
  expect(teamResumeId('intent', 'question', 'answer')).not.toBe(teamResumeId('intent', 'question', 'changed-answer'));
});

it.each(['current', 'dirty', 'foreign-run', 'stale'])('verifies the current Git checkpoint before resume: %s', async (kind) => {
  const h = setup();
  const checkpoint = { status: 'verified', taskId: 'task', intentId: 'intent', workerId: 'worker', runId: 'old-run',
    reference: 'stable-checkpoint', head: 'head', stateHash: 'sha256:saved-state', branch: 'delivery', worktree: '/private/task-worktree',
    nextAction: 'Use the maintainer answer', observedAt: h.now() - 10 };
  h.task.context = { worktree: checkpoint.worktree, branch: checkpoint.branch, nextAction: checkpoint.nextAction };
  h.task.team.workers[0].checkpoint = structuredClone(checkpoint);
  const originalRead = h.adapters.readWorker;
  h.adapters.readWorker = async (identity) => { const result = await originalRead(identity); delete result.checkpoint; return result; };
  h.adapters.readCheckpoint = async (identity) => ({ ...structuredClone(checkpoint), ...identity, observedAt: h.tick(),
    ...(kind === 'dirty' ? { stateHash: 'sha256:unsaved-change' } : {}),
    ...(kind === 'foreign-run' ? { runId: 'foreign' } : {}),
    ...(kind === 'stale' ? { observedAt: checkpoint.observedAt } : {}) });
  const result = await resumeTeamWorker(h.options);
  if (kind === 'current') {
    expect(result).toMatchObject({ status: 'resumed' });
    expect(h.calls[0].checkpoint).toEqual(checkpoint);
    expect(h.events[0].worker.checkpoint).toEqual(checkpoint);
  } else {
    expect(result).toMatchObject({ status: 'pending' }); expect(h.calls).toHaveLength(0);
  }
});

it.each(['completed', 'stopped', 'failed'])('binds an exact successor already %s without resending', async (status) => {
  const h = setup(); const readWorker = h.adapters.readWorker;
  h.adapters.readWorker = async (identity) => {
    const observation = await readWorker(identity);
    if (identity.resumeId) observation.status = status;
    return observation;
  };
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'resumed', runId: 'new-run' });
  expect(h.task.team.workers[0].observation.status).toBe(status);
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'resumed', runId: 'new-run' });
  expect(h.calls).toHaveLength(1);
});
it('reconciles an uncertain send whose exact successor completed before readback', async () => {
  const h = setup(); const resumeWorker = h.adapters.resumeWorker; const readWorker = h.adapters.readWorker;
  h.adapters.resumeWorker = async (identity) => { await resumeWorker(identity); throw new Error('Lost response.'); };
  h.adapters.readWorker = async (identity) => {
    const observation = await readWorker(identity); if (identity.resumeId) observation.status = 'completed'; return observation;
  };
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'pending' });
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'resumed', runId: 'new-run' });
  expect(h.calls).toHaveLength(1);
});
it('does not treat a missing successor as a bound resume', async () => {
  const h = setup(); const readWorker = h.adapters.readWorker;
  h.adapters.readWorker = async (identity) => {
    const observation = await readWorker(identity); if (identity.resumeId) observation.status = 'missing'; return observation;
  };
  expect(await resumeTeamWorker(h.options)).toMatchObject({ status: 'pending' });
  expect(h.task.team.workers[0].status).toBe('stopped'); expect(h.calls).toHaveLength(1);
});
