import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { runTeamTicketUpdate, resumeTeamTicketAnswer } from './agent-team-conversation.mjs';
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function setup() {
  let time = 1_700_000_000_000; const now = () => time; const tick = () => ++time;
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-ticket-')); directories.push(directory);
  const store = new AgentTaskStore(directory, { now }); const owner = 'coordinator';
  const issue = { uuid: id(7), teamId: id(2), projectId: id(3), title: 'Private idea', description: 'Research scope',
    attachments: [], labels: ['Captured'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'human', requestId: 'idea', revision: 'scope', mode: 'research', proposalBinding: binding,
    resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 100, maxToolCalls: 20 },
    authority: { actor: id(6), reference: 'human:request', revision: 'scope', observedAt: time,
      kind: 'maintainer-idea-request', proposalRevision: binding.revision },
    brief: { selectedOption: 'Research', permittedChanges: ['Private artifacts'], acceptanceCriteria: ['Sourced proposal'],
      visibility: 'private-planning', purpose: 'proposal-development', resultDestination: 'linear-proposal',
      destination: { kind: 'linear', issueId: id(7), teamId: id(2), projectId: id(3) } } };
  const task = await store.enqueue(request);
  const act = (action, input) => store.mutate(task.id, action, { owner, ...input });
  await act('claim', { durationMs: 100_000 });
  await act('resource-usage', { usage: { modelTokens: 0, toolCalls: 0, reference: 'usage:read', observedAt: tick() } });
  const policy = { organizationId: id(1), teamId: id(2), projectId: id(3), readerAppUserId: id(4), writerAppUserId: id(5), humanActorIds: [id(6)] };
  const destination = () => ({ status: 'available', ...policy, issueId: id(7), readerIsApp: true, private: true, active: true, synced: false, observedAt: tick() });
  const writes = []; let available = true;
  const adapters = {
    readIssue: async () => ({ status: 'available', issue: structuredClone(issue), reference: 'linear:issue', observedAt: tick() }),
    readRequest: async () => ({ status: 'authorized', request: { ...structuredClone(request), authority: { ...request.authority, observedAt: tick() } } }),
    readDestination: async () => destination(),
    readAuthority: async (receipt) => ({ status: 'available', taskId: task.id, issueId: id(7), scopeRevision: binding.revision,
      active: true, kind: 'discovery', actorIsApp: false, actorId: id(6), reference: 'human:request', expiresAt: time + 1000, observedAt: tick() }),
    writeUpdate: async (value) => { writes.push(value); },
    readUpdate: async (receipt) => writes.some((value) => value.receipt.updateId === receipt.updateId) && available
      ? { ...destination(), ...receipt, status: 'available', writerIsApp: true, onBehalfOf: null, url: 'https://linear.app/navet/issue/NAV-1', observedAt: tick() }
      : { status: available ? 'absent' : 'unavailable', observedAt: tick() },
    readAnswer: async ({ receipt, answerId }) => ({ ...destination(), answerId, questionId: receipt.questionId,
      questionUpdateId: receipt.updateId, taskId: task.id, scopeRevision: binding.revision, actorIsApp: false, actorId: id(6),
      onBehalfOf: null, scopeChanged: false, reference: 'linear:answer', createdAt: tick(), observedAt: tick(), text: 'Keep accepted scope',
      bodyHash: 'placeholder' }),
  };
  const reservation = await act('proposal-observation', { observation: await adapters.readIssue() });
  const reserved = await act('reserve-resources', { event: 'question-write', modelTokens: 0, toolCalls: 1 });
  return { store, task, act, writes, adapters, issue, policy, now, tick, directory, setAvailable: (value) => { available = value; },
    options: { store, owner, taskId: task.id, kind: 'question', questionId: 'question-a', body: 'Which option?', policy, adapters, now,
      resourceToken: reserved.resourceDecision.reservation.token } };
}
it('persists a blocking wait before uncertain publication and recovers its exact write without resending', async () => {
  const h = await setup();
  const adapters = { ...h.adapters, writeUpdate: async (value) => { h.writes.push(value); h.setAvailable(false); throw new Error('Lost acknowledgement'); } };
  expect(await runTeamTicketUpdate({ ...h.options, adapters })).toMatchObject({ status: 'uncertain' });
  let task = (await h.store.list())[0];
  expect(task.team.status).toBe('awaiting-input');
  expect(task.team.updates[0].receipt.attemptedAt).toBeGreaterThan(0);
  h.setAvailable(true);
  const restarted = new AgentTaskStore(h.directory, { now: h.now });
  expect(await runTeamTicketUpdate({ ...h.options, store: restarted })).toMatchObject({ status: 'verified' });
  expect(h.writes).toHaveLength(1);
  expect((await h.store.list())[0].team.questions).toHaveLength(1);
});
it('a verified human answer resumes the same task and an agent answer cannot resume it', async () => {
  const h = await setup();
  const linked = await runTeamTicketUpdate(h.options);
  expect(linked.status).toBe('verified');
  const { linearResultBodyHash } = await import('./agent-linear-result-reader.mjs');
  const adapters = { ...h.adapters, readAnswer: async (input) => {
    const answer = await h.adapters.readAnswer(input); return { ...answer, bodyHash: linearResultBodyHash(answer.text) };
  } };
  const options = { ...h.options, updateId: linked.updateId, answerId: id(9), adapters };
  expect(await resumeTeamTicketAnswer({ ...options, adapters: { ...adapters, readAnswer: async (input) => ({ ...await adapters.readAnswer(input), actorIsApp: true }) } }))
    .toMatchObject({ status: 'blocked' });
  expect((await h.store.list())[0].team.status).toBe('awaiting-input');
  expect(await resumeTeamTicketAnswer(options)).toMatchObject({ status: 'resumed', taskId: h.task.id });
  expect((await h.store.list())[0].team.status).toBe('planning');
  expect(await h.store.list()).toHaveLength(1);
});
it('one ticket operation cannot bind and consume a second reservation during replay', async () => {
  const h = await setup(); const linked = await runTeamTicketUpdate(h.options);
  const next = await h.act('reserve-resources', { event: 'duplicate-allocation', modelTokens: 0, toolCalls: 1 });
  await expect(h.act('team-event', { resourceToken: next.resourceDecision.reservation.token,
    authority: { actor: id(6), reference: 'human:request', revision: 'scope', kind: 'maintainer-idea-request',
      proposalRevision: h.task.proposal.binding.revision, observedAt: h.tick() },
    event: { eventId: 'duplicate-attempt', type: 'ticket-attempt', updateId: linked.updateId } })).rejects.toThrow('different reservation');
});
it('a stalled post-answer scope read is bounded and cannot record the answer later', async () => {
  const h = await setup(); const linked = await runTeamTicketUpdate(h.options);
  const { linearResultBodyHash } = await import('./agent-linear-result-reader.mjs');
  let entered; const started = new Promise((resolve) => { entered = resolve; });
  const adapters = { ...h.adapters, readIssue: async () => { entered(); return new Promise(() => {}); },
    readAnswer: async (input) => { const answer = await h.adapters.readAnswer(input); return { ...answer, bodyHash: linearResultBodyHash(answer.text) }; } };
  const controller = new AbortController();
  const pending = resumeTeamTicketAnswer({ ...h.options, updateId: linked.updateId, answerId: id(9), adapters, signal: controller.signal });
  await started; controller.abort();
  expect(await pending).toMatchObject({ status: 'pending' });
  expect((await h.store.list())[0].team.status).toBe('awaiting-input');
});

it('accepts a second installed human answer without changing the original request authority', async () => {
  const h = await setup();
  const linked = await runTeamTicketUpdate(h.options);
  const { linearResultBodyHash } = await import('./agent-linear-result-reader.mjs');
  const policy = { ...h.policy, humanActorIds: [id(6), id(8)] };
  const answerFrom = (actorId, actorIsApp = false) => ({ ...h.options, policy, updateId: linked.updateId, answerId: id(9),
    adapters: { ...h.adapters, readAnswer: async (input) => { const answer = await h.adapters.readAnswer(input);
      return { ...answer, actorId, actorIsApp, bodyHash: linearResultBodyHash(answer.text) }; } } });
  expect(await resumeTeamTicketAnswer(answerFrom(id(10)))).toMatchObject({ status: 'blocked' });
  expect(await resumeTeamTicketAnswer(answerFrom(id(8), true))).toMatchObject({ status: 'blocked' });
  expect((await h.store.list())[0].team.status).toBe('awaiting-input');
  expect(await resumeTeamTicketAnswer(answerFrom(id(8)))).toMatchObject({ status: 'resumed', taskId: h.task.id });
  const saved = (await h.store.list())[0];
  expect(saved.team.questions[0].answer.actor).toBe(id(8));
  expect(saved.authority.actor).toBe(id(6));
});
