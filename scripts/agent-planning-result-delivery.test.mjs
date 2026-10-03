import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLinearIssueReader } from './agent-linear-reader.mjs';
import { createLinearResultReader, linearResultBodyHash } from './agent-linear-result-reader.mjs';
import { createLinearResultWriter } from './agent-linear-result-writer.mjs';
import { deliverPlanningResult } from './agent-planning-result-delivery.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';

const directories = [];
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const body = 'Private worker Markdown with the actual evidence and options.';
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function setup(options = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-result-delivery-'));
  directories.push(directory);
  let time = 1_700_000_000_000;
  const now = () => time;
  const tick = () => ++time;
  const readerPolicy = { organizationId: id(1), appUserId: id(2), writerAppUserId: id(3), teamId: id(4), projectId: id(5) };
  const writerPolicy = { ...readerPolicy, appUserId: id(3) };
  const issue = { id: id(6), title: 'Investigate the approved journey', description: 'Record reproduction and options.',
    teamId: id(4), projectId: id(5), attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'trusted-maintainer-service', requestId: 'human-event', mode: 'research', revision: 'scope',
    planningBinding: binding, authority: { actor: 'maintainer', reference: 'verified-human-request', revision: 'scope',
      planningRevision: binding.revision, observedAt: time }, requiredGates: ['quality'],
    brief: { selectedOption: 'Investigate', permittedChanges: ['Return one scoped result to Linear.'],
      visibility: 'public-delivery-approved', resultDestination: 'linear-planning', acceptanceCriteria: ['Evidence and options are recorded.'] } };
  const store = new AgentTaskStore(directory, { now });
  const task = await store.enqueue(request);
  const owner = 'coordinator';
  const act = (action, input) => store.mutate(task.id, action, { owner, ...input });
  await act('claim', { durationMs: 100_000 });
  await act('planning-observation', { observation: { status: 'available', issue, observedAt: tick(), reference: 'initial-scope' } });
  await act('dispatch-intent', { authority: { ...request.authority, observedAt: tick() } });
  const dispatched = (await store.list())[0];
  await act('bind', { token: dispatched.dispatch.token, threadId: 'confirmed-worker' });
  await act('transition', { state: 'investigating', reason: 'Investigate the approved journey.' });
  await act('transition', { state: 'verifying', reason: 'Check the worker result.' });
  const comments = new Map();
  let mutations = 0;
  let writerCreations = 0;
  let withdrawn = false;
  const fetchImpl = async (_, init) => {
    tick();
    const payload = JSON.parse(init.body);
    const isWriter = init.headers.Authorization === 'Bearer writer-token';
    const identity = { organization: { id: id(1) }, viewer: { id: isWriter ? id(3) : id(2), app: true, active: true } };
    const remoteIssue = { id: issue.id, title: issue.title, description: issue.description,
      updatedAt: '2023-11-14T22:13:20.000Z', archivedAt: null, canceledAt: null,
      team: { id: issue.teamId }, project: { id: issue.projectId }, syncedWith: [],
      attachments: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      labels: { nodes: [{ id: id(8), name: 'Approved' }], pageInfo: { hasNextPage: false, endCursor: null } } };
    if (payload.query.startsWith('mutation')) {
      mutations++;
      const input = payload.variables.input;
      if (options.failBeforeCreate) throw new Error('Synthetic transport failure.');
      const comment = { id: input.id, body: input.body, issue: remoteIssue, user: { id: id(3), app: true, active: true },
        url: `https://linear.app/example/issue/NAV-42/research#comment-${input.id}`, createdAt: new Date(time).toISOString(),
        updatedAt: new Date(time).toISOString(), archivedAt: null, onBehalfOf: null, syncedWith: [] };
      comments.set(input.id, comment);
      if (options.loseAcknowledgement) throw new Error('Synthetic lost acknowledgement.');
      return Response.json({ data: { commentCreate: { success: true, comment } } });
    }
    if (payload.query.includes('NavetPlanningResult')) {
      const comment = comments.get(payload.variables.id);
      return comment ? Response.json({ data: { ...identity, comment } })
        : Response.json({ errors: [{ message: 'Permission-masked or missing comment.' }] });
    }
    return Response.json({ data: { ...identity, issue: remoteIssue } });
  };
  const readIssue = createLinearIssueReader({ policy: readerPolicy, getAccessToken: async () => 'reader-token', now, fetchImpl });
  const readResult = createLinearResultReader({ policy: readerPolicy, getAccessToken: async () => 'reader-token', now, fetchImpl });
  const input = { store, owner, taskId: task.id, head: null, body, writerAppUserId: id(3), now, readIssue, readResult,
    readRequest: async () => {
      tick();
      if (options.changeHeadDuringAuthority) await act('head', { head: 'changed-worker-head' });
      return withdrawn ? { status: 'withdrawn' } : { status: 'authorized', request: { ...request,
        authority: { ...request.authority, observedAt: time } } };
    }, createWriter: (adapters) => {
      writerCreations++;
      return createLinearResultWriter({ ...adapters, policy: writerPolicy,
        getAccessToken: async () => 'writer-token', fetchImpl, now });
    } };
  return { input, store, task, directory, act, request, now, comments, withdraw: () => { withdrawn = true; },
    counts: () => ({ mutations, writerCreations }) };
}

describe('coordinator result handoff with durable storage and real transport adapters', () => {
  it('creates and reads one exact artifact without recording quality evidence or completing the task', async () => {
    const { input, store, counts, directory } = await setup();
    const result = await deliverPlanningResult(input);
    expect(result.status).toBe('verified');
    const saved = (await store.list())[0];
    expect(saved).toMatchObject({ state: 'verifying', evidence: [], planningResult: { status: 'confirmed' } });
    expect(saved.planningResult.attemptedAt).toBeGreaterThanOrEqual(saved.planningResult.intentAt);
    expect(counts()).toEqual({ mutations: 1, writerCreations: 1 });
    expect(await readFile(path.join(directory, 'tasks.json'), 'utf8')).not.toContain(body);
    expect(JSON.stringify(result)).not.toMatch(/Private worker|writer-token|reader-token/);
  });

  it('performs the first send after an unavailable pre-send read without replacing the reserved identity', async () => {
    const { input, act, request, counts, store } = await setup();
    const reserved = await act('planning-result-intent', { head: null, bodyHash: linearResultBodyHash(body),
      writerAppUserId: input.writerAppUserId, authority: { ...request.authority, observedAt: input.now() } });
    await act('planning-result-observation', { commentId: reserved.planningResult.commentId, observation: { status: 'unavailable',
      observedAt: input.now(), reference: 'linear-result-unavailable' } });
    const before = (await store.list())[0].planningResult;
    expect(before.status).toBe('unverified');
    expect(before.attemptedAt).toBeUndefined();
    const result = await deliverPlanningResult(input);
    expect(result).toMatchObject({ status: 'verified', commentId: before.commentId });
    expect(counts()).toEqual({ mutations: 1, writerCreations: 1 });
    expect((await deliverPlanningResult({ ...input, body: undefined })).status).toBe('verified');
    expect(counts()).toEqual({ mutations: 1, writerCreations: 1 });
  });

  it('reconciles existing output after restart without worker Markdown or another writer session', async () => {
    const { input, counts, directory, now } = await setup();
    const first = await deliverPlanningResult(input);
    const second = await deliverPlanningResult({ ...input, body: undefined, store: new AgentTaskStore(directory, { now }) });
    expect(second).toMatchObject({ status: 'verified', commentId: first.commentId });
    expect(second.observedAt).toBeGreaterThan(first.observedAt);
    expect(counts()).toEqual({ mutations: 1, writerCreations: 1 });
  });

  it('verifies an actual created comment after its mutation acknowledgement is lost', async () => {
    const { input, counts } = await setup({ loseAcknowledgement: true });
    expect((await deliverPlanningResult(input)).status).toBe('verified');
    expect(counts().mutations).toBe(1);
  });

  it('preserves an uncertain failed create and never retries it after a masked not-found read', async () => {
    const { input, counts, store } = await setup({ failBeforeCreate: true });
    expect((await deliverPlanningResult(input)).status).toBe('pending');
    expect((await deliverPlanningResult({ ...input, body: undefined })).status).toBe('pending');
    expect(counts()).toEqual({ mutations: 1, writerCreations: 1 });
    expect((await store.list())[0]).toMatchObject({ state: 'verifying', evidence: [], planningResult: { status: 'unverified' } });
  });

  it('does not publish when human approval is withdrawn before the first intent', async () => {
    const { input, withdraw, counts, store } = await setup();
    withdraw();
    expect((await deliverPlanningResult(input)).status).toBe('blocked');
    expect(counts()).toEqual({ mutations: 0, writerCreations: 0 });
    expect((await store.list())[0].planningResult).toBeUndefined();
  });

  it('can observe an existing result after withdrawal without authorizing new publication', async () => {
    const { input, withdraw, counts } = await setup();
    await deliverPlanningResult(input);
    withdraw();
    expect((await deliverPlanningResult({ ...input, body: undefined })).status).toBe('verified');
    expect(counts()).toEqual({ mutations: 1, writerCreations: 1 });
  });

  it('invalidates prior success when a fresh result probe fails, then recovers through the actual reader', async () => {
    const { input, store, counts } = await setup();
    await deliverPlanningResult(input);
    const failed = await deliverPlanningResult({ ...input, body: undefined,
      readResult: async () => { throw new Error('private remote details'); } });
    expect(failed.status).toBe('pending');
    expect(JSON.stringify(failed)).not.toContain('private remote details');
    expect((await store.list())[0].planningResult.status).toBe('unverified');
    expect((await deliverPlanningResult({ ...input, body: undefined })).status).toBe('verified');
    expect(counts().mutations).toBe(1);
  });

  it('does not rebind old worker Markdown to a head changed during authority verification', async () => {
    const { input, store, counts } = await setup({ changeHeadDuringAuthority: true });
    expect((await deliverPlanningResult(input)).status).toBe('blocked');
    expect((await store.list())[0].planningResult).toBeUndefined();
    expect(counts().mutations).toBe(0);
  });

  it('requires the current owner lease before any remote read or mutation', async () => {
    const { input, counts } = await setup();
    expect((await deliverPlanningResult({ ...input, owner: 'other-owner' })).status).toBe('blocked');
    expect(counts()).toEqual({ mutations: 0, writerCreations: 0 });
  });

  it('honors cancellation and bounds a trusted-source stall without producing an artifact', async () => {
    const { input, counts } = await setup();
    const controller = new AbortController();
    controller.abort();
    expect((await deliverPlanningResult({ ...input, signal: controller.signal })).status).toBe('blocked');
    expect((await deliverPlanningResult({ ...input, maxRunMs: 50, readRequest: async () => new Promise(() => {}) })).status).toBe('blocked');
    expect(counts().mutations).toBe(0);
  });
});
