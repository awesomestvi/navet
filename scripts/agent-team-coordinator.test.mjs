import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { enqueueProposalRequest } from './agent-proposal-scope.mjs';
import { runTeamStep } from './agent-team-coordinator.mjs';
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup(delivery = false) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-')); directories.push(directory);
  let time = 1_700_000_000_000; const now = () => time; const tick = () => ++time;
  const issue = { uuid: 'private-issue', teamId: 'team', projectId: 'project', title: 'Idea', description: 'Research scope',
    attachments: [], labels: [delivery ? 'Approved' : 'Captured'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'human', requestId: delivery ? 'decision' : 'idea', revision: 'scope', mode: delivery ? 'implement' : 'research',
    ...(delivery ? { planningBinding: binding } : { proposalBinding: binding }),
    authority: { actor: 'maintainer', reference: 'human-decision', revision: 'scope', observedAt: time,
      ...(delivery ? { planningRevision: binding.revision } : { kind: 'maintainer-idea-request', proposalRevision: binding.revision }) },
    brief: { selectedOption: 'Explore idea', permittedChanges: ['Research artifacts'], acceptanceCriteria: ['Sourced options'],
      visibility: delivery ? 'public-delivery-approved' : 'private-planning',
      ...(!delivery ? { purpose: 'proposal-development', resultDestination: 'linear-proposal',
        destination: { kind: 'linear', issueId: binding.issueId, teamId: binding.teamId, projectId: binding.projectId } } : {}) } };
  const store = new AgentTaskStore(directory, { now });
  const calls = []; const owner = 'coordinator';
  const adapters = {
    readIssue: async () => ({ status: 'available', reference: 'linear:read', issue: structuredClone(issue), observedAt: tick() }),
    readRequest: async () => ({ status: 'authorized', request: { ...structuredClone(request), authority: { ...request.authority, observedAt: tick() } } }),
    createWorker: async (input) => { calls.push(input); return { workerId: `worker-${input.assignment.id}` }; },
    findWorker: async (identity) => ({ status: 'found', ...identity, workerId: 'worker-research', reference: 'runtime:lookup', observedAt: tick() }),
    readWorker: async (identity) => ({ ...identity, status: 'completed', reference: 'runtime:checkpoint', observedAt: tick(),
      evidence: [{ gate: identity.workerId.includes('review') ? 'independent-review' : 'focused-validation', result: 'pass',
        artifact: 'artifact:result', head: delivery ? 'head-a' : null, revision: 'scope', observedAt: tick() }] }),
  };
  const task = delivery ? await store.enqueue(request) : await enqueueProposalRequest({ store, identity: { source: 'human', requestId: 'idea' }, ...adapters, now });
  const act = (action, input) => store.mutate(task.id, action, { owner, ...input });
  await act('claim', { durationMs: 100_000 });
  await act(delivery ? 'planning-observation' : 'proposal-observation', { observation: await adapters.readIssue() });
  if (delivery) await act('head', { head: 'head-a' });
  const assignments = delivery ? [
    { id: 'build', role: 'developer', dependsOn: [], files: ['scripts/example.mjs'], brief: { acceptanceCriteria: ['Correct result'] } },
    { id: 'test', role: 'tester', dependsOn: ['build'], files: [], brief: { acceptanceCriteria: ['Verified result'] } },
    { id: 'review', role: 'independent-reviewer', dependsOn: ['test'], files: [], brief: { acceptanceCriteria: ['Independent current-head review'] } },
  ] : [{ id: 'research', role: 'researcher', dependsOn: [], files: [], brief: { acceptanceCriteria: ['Sourced options'] } }];
  await act('team-event', { event: { eventId: 'plan', type: 'plan', revision: 'plan-a', phase: delivery ? 'delivery' : 'proposal', assignments } });
  return { directory, store, task, act, calls, adapters, request, issue, now, tick,
    options: { store, owner, taskId: task.id, adapters, now } };
}
it('integrates private idea intake, specialist handoff, durable restart and proposal evidence without production work', async () => {
  const h = await setup();
  expect(await runTeamStep(h.options)).toMatchObject({ status: 'bound' });
  expect(h.calls[0].mode).toBe('research');
  expect(h.calls[0].brief.visibility).toBe('private-planning');
  const restarted = new AgentTaskStore(h.directory, { now: h.now });
  expect(await runTeamStep({ ...h.options, store: restarted })).toMatchObject({ status: 'completed' });
  expect(await runTeamStep(h.options)).toMatchObject({ status: 'evidence-ready' });
  expect(h.calls).toHaveLength(1);
  await h.act('team-event', { event: { eventId: 'proposal', type: 'proposal', reference: 'linear:verified-proposal', observedAt: h.tick() } });
  expect((await h.store.list())[0].team.status).toBe('awaiting-prioritization');
});
it('reconciles uncertain creation after restart without a second send', async () => {
  const h = await setup();
  let attempts = 0;
  const adapters = { ...h.adapters, createWorker: async () => { attempts++; throw new Error('Lost response'); } };
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'pending' });
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'bound' });
  expect(attempts).toBe(1);
});
it('dispatches only once under concurrent coordinator calls', async () => {
  const h = await setup();
  await Promise.all([runTeamStep(h.options), runTeamStep(h.options)]);
  expect(h.calls).toHaveLength(1);
});
it('halts unavailable, withdrawn and stale approval before model execution', async () => {
  const h = await setup();
  await runTeamStep({ ...h.options, adapters: { ...h.adapters, readIssue: async () => { throw new Error('Access revoked'); } } });
  expect(h.calls).toHaveLength(0);
  expect((await h.store.list())[0].proposal.observation.result).toBe('unverified');
  await runTeamStep({ ...h.options, adapters: { ...h.adapters, readRequest: async () => ({ status: 'withdrawn' }) } });
  expect(h.calls).toHaveLength(0);
  expect((await h.store.list())[0].requestRevocation.status).toBe('withdrawn');
});
it('integrates approved build, testing and separate current-head review before one PR; head changes invalidate readiness', async () => {
  const h = await setup(true);
  for (let i = 0; i < 6; i++) await runTeamStep(h.options);
  expect(h.calls.map((item) => item.assignment.role)).toEqual(['developer', 'tester', 'independent-reviewer']);
  await h.act('team-event', { event: { eventId: 'pr', type: 'pr', url: 'https://github.com/owner/repo/pull/1',
    preview: 'https://preview.example', head: 'head-a', revision: 'scope', reference: 'github:readback', observedAt: h.tick() } });
  expect((await h.store.list())[0].team.status).toBe('awaiting-review');
  await h.act('head', { head: 'head-b' });
  expect((await h.store.list())[0].team.status).toBe('verifying');
  expect(await runTeamStep(h.options)).toMatchObject({ status: 'blocked', reason: 'team-replan-required' });
});
it('interrupts the exact running specialist after withdrawal and preserves its stopped checkpoint through a lost acknowledgement', async () => {
  const h = await setup();
  await runTeamStep(h.options);
  let running = true; const interruptions = [];
  const adapters = { ...h.adapters, maxStopAttempts: 1,
    readRequest: async () => ({ status: 'withdrawn' }),
    readWorker: async (identity) => ({ ...identity, status: running ? 'running' : 'stopped', runId: 'run-a',
      reference: 'runtime:exact-run', observedAt: h.tick(), ...(!running ? { checkpoint: { head: null, reference: 'git:checkpoint', nextAction: 'Wait for authority' } } : {}) }),
    interruptWorker: async (identity) => { interruptions.push(identity); running = false; throw new Error('Lost acknowledgement'); } };
  const result = await runTeamStep({ ...h.options, adapters });
  expect(result).toMatchObject({ status: 'stopped' });
  expect(interruptions).toHaveLength(1);
  expect(interruptions[0]).toMatchObject({ workerId: 'worker-research', runId: 'run-a' });
  const task = (await h.store.list())[0];
  expect(task.requestRevocation.status).toBe('withdrawn');
  expect(task.team.workers[0].status).toBe('stopped');
  expect(task.team.workers[0].checkpoint.reference).toBe('git:checkpoint');
  expect(h.calls).toHaveLength(1);
});
it('retains an unresolved exact stop and cannot exceed its accepted interruption attempts', async () => {
  const h = await setup(); await runTeamStep(h.options);
  let interruptions = 0;
  const adapters = { ...h.adapters, maxStopAttempts: 1, readRequest: async () => ({ status: 'withdrawn' }),
    readWorker: async (identity) => ({ ...identity, status: 'running', runId: 'run-a', reference: 'runtime:exact-run', observedAt: h.tick() }),
    interruptWorker: async () => { interruptions++; throw new Error('Unknown effect'); } };
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'pending' });
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'pending' });
  expect(interruptions).toBe(1);
  expect(h.calls).toHaveLength(1);
});
it.each(['pending-stop', 'during-interruption'])('reconciles exact completion %s without another interruption or replacement', async (kind) => {
  const h = await setup(); await runTeamStep(h.options);
  let completed = kind === 'pending-stop'; const interruptions = [];
  if (completed) await h.act('team-event', { event: { eventId: 'stop-intent', type: 'worker-stop-intent', intentId: `${h.task.id}:research:plan-a`,
    stopToken: 'stop-token', reason: 'request-withdrawn', maxAttempts: 1,
    worker: { workerId: 'worker-research', status: 'running', runId: 'run-a', reference: 'runtime:running', observedAt: h.tick() } } });
  const adapters = { ...h.adapters, maxStopAttempts: 1, readRequest: async () => ({ status: 'withdrawn' }),
    readWorker: async (identity) => ({ ...identity, status: completed ? 'completed' : 'running', runId: 'run-a',
      reference: 'runtime:exact-run', observedAt: h.tick(), ...(completed ? {
        checkpoint: { head: null, reference: 'git:checkpoint', nextAction: 'Review completed specialist work' },
        evidence: [{ gate: 'focused-validation', result: 'pass', artifact: 'artifact:completed', head: null, revision: 'scope', observedAt: h.tick() }],
      } : {}) }),
    interruptWorker: async (identity) => { interruptions.push(identity); completed = true; throw new Error('Lost acknowledgement'); } };
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'completed' });
  const task = (await h.store.list())[0];
  expect(task.team.workers[0].stop.status).toBe('stopped');
  expect(task.team.workers[0].status).toBe('completed');
  expect(task.team.workers[0].evidence).toMatchObject([{ artifact: 'artifact:completed', result: 'pass' }]);
  expect(task.team.workers[0].checkpoint.reference).toBe('git:checkpoint');
  expect(interruptions).toHaveLength(kind === 'pending-stop' ? 0 : 1); expect(h.calls).toHaveLength(1);
  await runTeamStep({ ...h.options, adapters });
  expect(interruptions).toHaveLength(kind === 'pending-stop' ? 0 : 1); expect(h.calls).toHaveLength(1);
});
it('automatic resume selects the question captured by its stop ahead of newer unrelated answers', async () => {
  const h = await setup(); await runTeamStep(h.options);
  let runtime = 'running'; let resumeId; let runId = 'old-run'; const resumes = [];
  const checkpoint = { head: null, reference: 'git:checkpoint', nextAction: 'Continue selected option' };
  const adapters = { ...h.adapters, maxStopAttempts: 1,
    readWorker: async (identity) => ({ ...identity, resumeId, status: runtime, runId, reference: 'runtime:read', observedAt: h.tick(),
      ...(runtime === 'stopped' ? { checkpoint } : {}) }),
    interruptWorker: async () => { runtime = 'stopped'; },
    resumeWorker: async (identity) => { resumes.push(identity); resumeId = identity.resumeId; runtime = 'running'; runId = 'new-run'; },
    findResume: async (identity) => ({ ...identity, status: 'found', runId, reference: 'runtime:resume', observedAt: h.tick() }),
  };
  const ask = async (questionId) => h.act('team-event', { event: { eventId: `question:${questionId}`, type: 'question', questionId,
    text: `Clarify ${questionId}`, reference: `linear:question:${questionId}`, observedAt: h.tick() } });
  const answer = async (questionId) => h.act('team-event', { event: { eventId: `answer:${questionId}`, type: 'answer', questionId,
    answer: { actor: 'maintainer', text: `Answer ${questionId}`, verified: true, reference: `linear:answer:${questionId}`,
      observedAt: h.tick(), planningRevision: h.request.proposalBinding.revision } } });
  await ask('blocked-question');
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'stopped' });
  expect((await h.store.list())[0].team.workers[0].stop.questionIds).toEqual(['blocked-question']);
  await ask('later-unrelated-question');
  await answer('blocked-question'); await answer('later-unrelated-question');
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'resumed', runId: 'new-run' });
  expect(resumes).toHaveLength(1); expect(resumes[0].answer.reference).toBe('linear:answer:blocked-question');
  expect(h.calls).toHaveLength(1);
});
it('a verified answer resumes the same stopped specialist handle without replanning or creating a replacement', async () => {
  const h = await setup(); await runTeamStep(h.options);
  let runtime = 'running'; let resumeId; let runId = 'old-run'; const resumes = [];
  const checkpoint = { head: null, reference: 'git:checkpoint', nextAction: 'Continue selected option' };
  const adapters = { ...h.adapters, maxStopAttempts: 1,
    readWorker: async (identity) => ({ ...identity, resumeId, status: runtime, runId, reference: 'runtime:read', observedAt: h.tick(),
      ...(runtime === 'stopped' ? { checkpoint } : {}) }),
    interruptWorker: async () => { runtime = 'stopped'; },
    resumeWorker: async (identity) => { resumes.push(identity); resumeId = identity.resumeId; runtime = 'running'; runId = 'new-run'; },
    findResume: async (identity) => ({ ...identity, status: 'found', runId, reference: 'runtime:resume', observedAt: h.tick() }),
  };
  await h.act('team-event', { event: { eventId: 'question', type: 'question', questionId: 'q', text: 'Which option?', reference: 'linear:question', observedAt: h.tick() } });
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'stopped' });
  await h.act('team-event', { event: { eventId: 'answer', type: 'answer', questionId: 'q', answer: { actor: 'maintainer', text: 'Keep selected scope',
    verified: true, reference: 'linear:human-answer', observedAt: h.tick(), planningRevision: h.request.proposalBinding.revision } } });
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'resumed', workerId: 'worker-research', runId: 'new-run' });
  expect(resumes).toHaveLength(1);
  expect(h.calls).toHaveLength(1);
  const task = (await h.store.list())[0];
  expect(task.team.plan.revision).toBe('plan-a');
  expect(task.team.workers[0].workerId).toBe('worker-research');
  expect(task.team.workers[0].status).toBe('running');
});

it('hands scoped research through a real developer commit to current-head testing and review without replanning', async () => {
  const h = await setup(true);
  const { execFileSync } = await import('node:child_process');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { createTeamCheckpointReader } = await import('./agent-team-checkpoint.mjs');
  const { teamAssignmentComplete } = await import('./agent-team-state.mjs');
  const worktree = path.join(h.directory, 'worktree');
  await mkdir(worktree);
  const git = (...args) => execFileSync('git', args, { cwd: worktree, encoding: 'utf8',
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } }).trim();
  git('init', '-q', '-b', 'feature/team');
  git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.com');
  git('config', 'commit.gpgSign', 'false'); git('config', 'core.hooksPath', '/dev/null');
  await writeFile(path.join(worktree, 'result.txt'), 'baseline\n');
  git('add', '.'); git('commit', '-qm', 'fixture baseline');
  const originHead = git('rev-parse', 'HEAD');
  await h.act('head', { head: originHead });
  await h.act('context', { context: { worktree, branch: 'feature/team', nextAction: 'Verify approved delivery' } });
  await h.act('team-event', { event: { eventId: 'pipeline-plan', type: 'plan', revision: 'pipeline-a', phase: 'delivery', assignments: [
    { id: 'research', role: 'researcher', dependsOn: [], files: [], brief: { purpose: 'Accepted scope evidence' } },
    { id: 'build', role: 'developer', dependsOn: ['research'], files: ['result.txt'], brief: { purpose: 'Approved implementation' } },
    { id: 'test', role: 'tester', dependsOn: ['build'], files: [], brief: { purpose: 'Current-head validation' } },
    { id: 'review', role: 'independent-reviewer', dependsOn: ['test'], files: [], brief: { purpose: 'Independent current-head review' } },
  ] } });
  let built = false;
  const readWorker = async (identity) => {
    if (identity.workerId === 'worker-build' && !built) {
      await writeFile(path.join(worktree, 'result.txt'), 'approved specialist result\n');
      git('add', '.'); git('commit', '-qm', 'fixture developer result'); built = true;
    }
    const applicability = identity.workerId === 'worker-research' ? 'scope' : identity.workerId === 'worker-build' ? 'output' : 'head';
    return { ...identity, status: 'completed', runId: `${identity.workerId}:run`, reference: `runtime:${identity.workerId}`, observedAt: h.tick(),
      evidence: [{ gate: identity.workerId === 'worker-review' ? 'independent-review' : 'focused-validation', applicability,
        artifact: `artifact:${identity.workerId}`, result: 'pass', head: git('rev-parse', 'HEAD'), revision: 'scope', observedAt: h.tick() }] };
  };
  const adapters = { ...h.adapters, readWorker,
    readCheckpoint: createTeamCheckpointReader({ store: h.store, owner: 'coordinator', readWorker, now: h.now }) };
  for (let index = 0; index < 8; index++) expect(await runTeamStep({ ...h.options, adapters }))
    .toMatchObject({ status: index % 2 === 0 ? 'bound' : 'completed' });
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'evidence-ready' });
  const deliveryHead = git('rev-parse', 'HEAD');
  expect(deliveryHead).not.toBe(originHead);
  const saved = (await h.store.list())[0];
  expect(saved.head).toBe(deliveryHead); expect(saved.team.checkpoint.head).toBe(deliveryHead);
  expect(saved.team.plan.revision).toBe('pipeline-a');
  expect(h.calls.map((item) => item.assignment.role)).toEqual(['researcher', 'developer', 'tester', 'independent-reviewer']);
  expect(saved.team.workers[0].evidence[0]).toMatchObject({ applicability: 'scope', head: originHead, result: 'pass' });
  expect(saved.team.workers[1].evidence[0]).toMatchObject({ applicability: 'output', head: deliveryHead, result: 'pass' });
  expect(saved.team.workers.slice(2).every((worker) => worker.evidence[0].head === deliveryHead && worker.evidence[0].result === 'pass')).toBe(true);
  await writeFile(path.join(worktree, 'result.txt'), 'later changed delivery\n');
  git('add', '.'); git('commit', '-qm', 'fixture later head');
  await h.act('head', { head: git('rev-parse', 'HEAD') });
  const changed = (await h.store.list())[0];
  expect(teamAssignmentComplete(changed, 'research')).toBe(true);
  expect(teamAssignmentComplete(changed, 'build')).toBe(true);
  expect(teamAssignmentComplete(changed, 'test')).toBe(false);
  expect(teamAssignmentComplete(changed, 'review')).toBe(false);
  expect(changed.team.workers[0].evidence[0].head).toBe(originHead);
  expect(changed.team.workers[1].evidence[0].head).toBe(deliveryHead);
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'blocked', reason: 'team-replan-required' });
  expect(h.calls).toHaveLength(4);
  // Real Git commits and eight durable worker transitions need headroom under parallel CI load.
}, 15000);

it.each(['failed', 'missing'])('reconciles a %s specialist after interruption and permits deliberate replanning', async (status) => {
  const h = await setup();
  await runTeamStep(h.options);
  let interrupted = false;
  const adapters = { ...h.adapters, maxStopAttempts: 1,
    readRequest: async () => ({ status: 'withdrawn' }),
    readWorker: async (identity) => ({ ...identity, status: interrupted ? status : 'running', runId: 'run-a',
      reference: 'runtime:exact-run', observedAt: h.tick() }),
    interruptWorker: async () => { interrupted = true; throw new Error('Worker exited before acknowledgement'); } };
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status });
  const saved = (await h.store.list())[0];
  expect(saved.team.workers[0]).toMatchObject({ status, evidence: [], stop: { status: 'stopped', runId: 'run-a' } });
  expect(saved.team.workers[0].checkpoint).toBeUndefined();
  expect(await runTeamStep({ ...h.options, adapters })).toMatchObject({ status: 'blocked', reason: 'team-replan-required' });
  // A withdrawn request still blocks execution; the reducer permits a fresh authorized plan.
  const { applyTeamEvent } = await import('./agent-team-state.mjs');
  applyTeamEvent(saved, { eventId: 'replan', type: 'plan', revision: 'plan-b', phase: saved.team.plan.phase,
    assignments: saved.team.plan.assignments }, h.tick());
  expect(saved.team.plan.revision).toBe('plan-b');
  expect(h.calls).toHaveLength(1);
});
