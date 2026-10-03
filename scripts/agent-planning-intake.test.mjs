import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { enqueuePlanningRequest } from './agent-planning-intake.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';

const directories = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function setup() {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-planning-intake-'));
  directories.push(directory);
  let time = 1_700_000_000_000;
  const now = () => time;
  const store = new AgentTaskStore(directory, { now });
  const identity = { source: 'trusted-maintainer-request', requestId: 'human-event' };
  const issue = { uuid: 'proposal', teamId: 'team', projectId: 'project', title: 'Private idea',
    description: 'Approved option A with reopen persistence.', attachments: [],
    labels: ['Approved'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { ...identity, mode: 'implement', revision: 'option-a', planningBinding: binding,
    authority: { actor: 'maintainer', reference: 'trusted-human-event', revision: 'option-a',
      planningRevision: binding.revision, observedAt: time },
    brief: { selectedOption: 'Option A', permittedChanges: ['Repair settings persistence and direct regression coverage.'],
      visibility: 'public-delivery-approved', acceptanceCriteria: ['Save and reopen preserves the selected option.'] } };
  const input = { store, identity, now,
    readRequest: async () => ({ status: 'authorized', request: { ...request,
      authority: { ...request.authority, observedAt: time } } }),
    readIssue: async () => ({ status: 'available', issue, reference: 'linear:live-read', observedAt: time }) };
  return { input, issue, request, store, advance: (duration) => { time += duration; } };
}

describe('trusted planning request intake', () => {
  it('queues one exact approved scope without claiming, dispatching or storing a planning pass', async () => {
    const { input, store, request } = await setup();
    const reads = [];
    const task = await enqueuePlanningRequest({ ...input,
      readRequest: async (identity) => { reads.push(identity); return input.readRequest(); },
      readIssue: async (id) => { reads.push(id); return input.readIssue(); } });
    expect(reads).toEqual([input.identity, 'proposal', input.identity]);
    expect(task).toMatchObject({ state: 'queued', authority: request.authority,
      planning: { binding: request.planningBinding, observation: null }, lease: null, dispatch: null });
    expect((await enqueuePlanningRequest(input)).id).toBe(task.id);
    expect(await store.list()).toHaveLength(1);
  });

  it('requires another live planning read before the queued task can start or dispatch', async () => {
    const { input, store, request } = await setup();
    const task = await enqueuePlanningRequest(input);
    const owner = 'coordinator';
    await store.mutate(task.id, 'claim', { owner, durationMs: 30_000 });
    const dispatch = () => store.mutate(task.id, 'dispatch-intent', { owner, authority: request.authority });
    await expect(dispatch()).rejects.toThrow('planning-observation-stale');
    await expect(store.mutate(task.id, 'transition', { owner, state: 'investigating', reason: 'Start approved work.' }))
      .rejects.toThrow('planning-observation-stale');
    await store.mutate(task.id, 'planning-observation', { owner, observation: await input.readIssue() });
    expect((await dispatch()).dispatch).toMatchObject({ intentAt: input.now(), threadId: null });
    expect(await store.list()).toHaveLength(1);
  });

  it.each(['none', 'unavailable', 'withdrawn'])('does not interpret %s authority as approval', async (status) => {
    const { input, store } = await setup();
    let issueReads = 0;
    await expect(enqueuePlanningRequest({ ...input,
      readRequest: async () => ({ status }), readIssue: async () => { issueReads++; } })).rejects.toThrow('not authorized');
    expect(issueReads).toBe(0);
    expect(await store.list()).toEqual([]);
  });

  it.each([
    { description: 'Option B replaces A.' },
    { teamId: 'other-team' },
    { projectId: 'other-project' },
    { attachments: [{ id: 'new', url: 'https://example.test/design' }] },
    { labels: ['Deferred'] },
    { labels: ['Approved', 'Rejected'] },
    { archivedAt: '2026-01-01T00:00:00Z' },
  ])('rejects changed or withdrawn proposal %j without creating work', async (change) => {
    const { input, issue, store } = await setup();
    await expect(enqueuePlanningRequest({ ...input, readIssue: async () => ({
      ...(await input.readIssue()), issue: { ...issue, ...change } }) })).rejects.toThrow('Planning intake blocked');
    expect(await store.list()).toEqual([]);
  });

  it('rejects loss of service access and incomplete attachment reads', async () => {
    const { input, issue, store } = await setup();
    await expect(enqueuePlanningRequest({ ...input, readIssue: async () => ({
      status: 'unavailable', reference: 'access-denied', observedAt: input.now() }) })).rejects.toThrow('access-unverified');
    await expect(enqueuePlanningRequest({ ...input, readIssue: async () => ({
      ...(await input.readIssue()), issue: { ...issue, attachments: undefined } }) })).rejects.toThrow('complete array');
    expect(await store.list()).toEqual([]);
  });

  it('rechecks approval after the Linear read and rejects a withdrawn request', async () => {
    const { input, store } = await setup();
    let reads = 0;
    await expect(enqueuePlanningRequest({ ...input,
      readRequest: async () => ++reads === 1 ? input.readRequest() : { status: 'withdrawn' } })).rejects.toThrow('not authorized');
    expect(reads).toBe(2);
    expect(await store.list()).toEqual([]);
  });

  it('rejects changed acceptance criteria even if the proposal fingerprint is unchanged', async () => {
    const { input, store } = await setup();
    let reads = 0;
    await expect(enqueuePlanningRequest({ ...input, readRequest: async () => {
      const observation = await input.readRequest();
      if (++reads === 2) observation.request.brief = { ...observation.request.brief, acceptanceCriteria: ['Different outcome.'] };
      return observation;
    } })).rejects.toThrow('changed during');
    expect(await store.list()).toEqual([]);
  });

  it.each(['source', 'requestId'])('rejects a mismatched trusted %s', async (key) => {
    const { input, request, store } = await setup();
    await expect(enqueuePlanningRequest({ ...input, readRequest: async () => ({
      status: 'authorized', request: { ...request, [key]: 'different' } }) })).rejects.toThrow('identity mismatch');
    expect(await store.list()).toEqual([]);
  });

  it('rejects approval for a different planning revision or task scope', async () => {
    const { input, request, store } = await setup();
    for (const key of ['planningRevision', 'revision']) {
      await expect(enqueuePlanningRequest({ ...input, readRequest: async () => ({ status: 'authorized',
        request: { ...request, authority: { ...request.authority, [key]: 'different' } } }) })).rejects.toThrow('exact accepted scope');
    }
    expect(await store.list()).toEqual([]);
  });

  it('rejects cached authority after the planning read', async () => {
    const { input, request, store, advance } = await setup();
    await expect(enqueuePlanningRequest({ ...input,
      readRequest: async () => ({ status: 'authorized', request }),
      readIssue: async () => { advance(1); return input.readIssue(); } })).rejects.toThrow('fresh authority');
    expect(await store.list()).toEqual([]);
  });

  it('rejects a cached Linear observation', async () => {
    const { input, store, advance } = await setup();
    await expect(enqueuePlanningRequest({ ...input, readRequest: async () => {
      advance(1); return input.readRequest();
    }, readIssue: async () => ({ ...(await input.readIssue()), observedAt: input.now() - 1 }) })).rejects.toThrow('fresh service read');
    expect(await store.list()).toEqual([]);
  });

  it('rejects a slow combined intake even when both adapters return current observations', async () => {
    const { input, store, advance } = await setup();
    await expect(enqueuePlanningRequest({ ...input, readIssue: async () => {
      advance(60_001); return input.readIssue();
    } })).rejects.toThrow('fresh-read window');
    expect(await store.list()).toEqual([]);
  });

  it.each(['selectedOption', 'permittedChanges', 'visibility', 'acceptanceCriteria'])('rejects missing work-brief %s before reading Linear', async (key) => {
    const { input, store } = await setup();
    let planningReads = 0;
    await expect(enqueuePlanningRequest({ ...input, readRequest: async () => {
      const observation = await input.readRequest();
      delete observation.request.brief[key];
      return observation;
    }, readIssue: async () => { planningReads++; } })).rejects.toThrow('Trusted work brief requires');
    expect(planningReads).toBe(0);
    expect(await store.list()).toEqual([]);
  });

  it.each([{ selectedOption: ' ' }, { permittedChanges: [] }, { permittedChanges: [''] },
    { visibility: 'public' }, { acceptanceCriteria: [] }])('rejects incomplete or implicit scope permission %j', async (change) => {
    const { input, store } = await setup();
    await expect(enqueuePlanningRequest({ ...input, readRequest: async () => {
      const observation = await input.readRequest();
      Object.assign(observation.request.brief, change);
      return observation;
    } })).rejects.toThrow('Trusted work brief requires');
    expect(await store.list()).toEqual([]);
  });

  it.each(['implement', 'steward'])('rejects private-only %s intake before accessing Linear', async (mode) => {
    const { input, store } = await setup();
    let planningReads = 0;
    await expect(enqueuePlanningRequest({ ...input, readRequest: async () => {
      const observation = await input.readRequest();
      observation.request.mode = mode;
      observation.request.brief.visibility = 'private-planning';
      return observation;
    }, readIssue: async () => { planningReads++; } })).rejects.toThrow('visibility approval');
    expect(planningReads).toBe(0);
    expect(await store.list()).toEqual([]);
  });

  it.each(['research', 'audit'])('retains private %s as planning work without a public delivery grant', async (mode) => {
    const { input } = await setup();
    const task = await enqueuePlanningRequest({ ...input, readRequest: async () => {
      const observation = await input.readRequest();
      observation.request.mode = mode;
      observation.request.brief.visibility = 'private-planning';
      return observation;
    } });
    expect(task).toMatchObject({ state: 'queued', mode, brief: { visibility: 'private-planning' }, dispatch: null });
  });
});
