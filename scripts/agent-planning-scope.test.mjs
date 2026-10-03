import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlanningBinding, evaluatePlanningObservation, planningAttachmentReference, planningStatus } from './agent-planning-scope.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';

const now = 1_000_000;
const directories = [];
const issue = () => ({ id: 'NAV-42', uuid: 'issue-uuid', teamId: 'team', projectId: 'project',
  title: 'Improve a setting', description: 'Selected option: A. Save and reopen must preserve it.',
  labels: ['Approved', 'type: ux'], archivedAt: null, canceledAt: null, attachments: [{ id: 'a', url: 'https://example.test/reference' }] });
const observation = (value = issue(), extra = {}) => ({ status: 'available', issue: value,
  reference: 'linear:verified-live-read', observedAt: now, ...extra });
afterEach(async () => { await Promise.all(directories.splice(0).map((d) => rm(d, { recursive: true, force: true }))); });

async function setup({ bounded = false, bound = true, visibility = 'public-delivery-approved', mode = 'implement' } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-planning-scope-'));
  directories.push(directory);
  let time = now;
  const store = new AgentTaskStore(directory, { now: () => time });
  const request = { source: 'trusted-maintainer-request', requestId: 'human-event', mode,
    revision: 'selected-scope-v1', authority: { actor: 'maintainer', reference: 'trusted-human-event', observedAt: now,
      ...(bound ? { planningRevision: createPlanningBinding(issue()).revision } : {}) },
    brief: { visibility, acceptanceCriteria: ['Save and reopen preserves the setting.'] },
    ...(bound ? { planningBinding: createPlanningBinding(issue()) } : {}),
    ...(bounded ? { resourceLimits: { maxElapsedMs: 300_000, maxModelTokens: 1000, maxToolCalls: 10 } } : {}) };
  const task = await store.enqueue(request);
  const act = (action, input = {}) => store.mutate(task.id, action, { owner: 'coordinator', ...input });
  await act('claim', { durationMs: 300_000 });
  const observe = (value = issue(), extra = {}) => act('planning-observation', {
    observation: observation(value, { observedAt: time, ...extra }) });
  const dispatch = () => act('dispatch-intent', { authority: { ...request.authority, revision: request.revision, observedAt: time } });
  return { directory, store, request, task, act, observe, dispatch, advance: (delta) => { time += delta; } };
}

describe('planning scope identity', () => {
  it('ignores priority, account attribution and stage changes without treating them as authority', () => {
    const original = createPlanningBinding(issue());
    expect(createPlanningBinding({ ...issue(), priority: 1, createdById: 'maintainer', labels: ['In delivery'] })).toEqual(original);
    expect(original).not.toHaveProperty('authority');
  });

  it.each(['title', 'description', 'uuid', 'teamId', 'projectId'])('invalidates changed %s', (field) => {
    const original = issue();
    expect(evaluatePlanningObservation(createPlanningBinding(original), observation({ ...original, [field]: 'changed' }), now).result).toBe('fail');
  });

  it('binds complete attachment references while ignoring service ordering', () => {
    const original = { ...issue(), attachments: [...issue().attachments, { id: 'b', url: 'https://example.test/second' }] };
    const binding = createPlanningBinding(original);
    expect(createPlanningBinding({ ...original, attachments: [...original.attachments].reverse() })).toEqual(binding);
    expect(createPlanningBinding({ ...original, attachments: original.attachments.slice(1) })).not.toEqual(binding);
    expect(() => createPlanningBinding({ ...original, attachments: [...original.attachments, original.attachments[0]] })).toThrow('Duplicate');
    expect(() => createPlanningBinding({ ...original, attachments: undefined })).toThrow('complete array');
  });

  it.each(['Deferred', 'Rejected', 'Superseded', 'Ready for prioritization', 'Validated'])('stops new work at %s', (stage) => {
    expect(evaluatePlanningObservation(createPlanningBinding(issue()), observation({ ...issue(), labels: [stage] }), now)).toMatchObject({ result: 'fail', reason: 'planning-proposal-withdrawn' });
  });

  it('preserves attachment scope across renewed Linear file access signatures', () => {
    const file = 'https://uploads.linear.app/workspace/file?signature=first';
    const original = { ...issue(), attachments: [{ id: 'a', url: file }] };
    const renewed = { ...original, attachments: [{ id: 'a', url: file.replace('first', 'second') }] };
    expect(createPlanningBinding(renewed)).toEqual(createPlanningBinding(original));
    expect(evaluatePlanningObservation(createPlanningBinding(original), observation(renewed), now).result).toBe('pass');
    for (const url of ['https://uploads.linear.app/workspace/other?signature=second',
      file + '&version=2', file + '#changed', 'https://example.test/workspace/file?signature=first']) {
      expect(createPlanningBinding({ ...original, attachments: [{ id: 'a', url }] })).not.toEqual(createPlanningBinding(original));
    }
  });

  it('preserves embedded Linear image and link scope across renewed signatures', () => {
    const url = 'https://uploads.linear.app/workspace/file?version=1&signature=first#image';
    const original = { ...issue(), description: `Image: ![caption](${url})\n[reference]: ${url}\n<${url}>` };
    const binding = createPlanningBinding(original);
    const renewed = { ...original, description: original.description.replaceAll('signature=first', 'signature=second') };
    expect(createPlanningBinding(renewed)).toEqual(binding);
    expect(evaluatePlanningObservation(binding, observation(renewed), now).result).toBe('pass');
    const unsigned = { ...original, description: original.description.replaceAll('&signature=first', '') };
    expect(createPlanningBinding(unsigned)).toEqual(binding);
    for (const description of [original.description.replace('caption', 'new caption'),
      original.description.replaceAll('/file?', '/other?'), original.description.replaceAll('version=1', 'version=2'),
      original.description.replaceAll('#image', '#other'), original.description + ' New acceptance criterion.']) {
      expect(createPlanningBinding({ ...original, description })).not.toEqual(binding);
    }
    const prose = { ...issue(), description: 'See https://uploads.linear.app/workspace/file?signature=first.' };
    expect(createPlanningBinding({ ...prose, description: 'See https://uploads.linear.app/workspace/file.' }))
      .toEqual(createPlanningBinding(prose));
    expect(createPlanningBinding({ ...prose, description: prose.description.slice(0, -1) }))
      .not.toEqual(createPlanningBinding(prose));
    const external = { ...issue(), description: 'https://example.test/?redirect=https://uploads.linear.app/workspace/file?signature=first' };
    expect(createPlanningBinding({ ...external, description: external.description.replace('first', 'second') }))
      .not.toEqual(createPlanningBinding(external));
  });

  it.each(['archivedAt', 'canceledAt'])('rejects missing or malformed lifecycle field %s at the direct observation boundary', async (field) => {
    const { observe, dispatch } = await setup();
    for (const value of [undefined, '', 'not-a-timestamp', 1, false]) {
      const incomplete = { ...issue(), [field]: value };
      if (value === undefined) delete incomplete[field];
      await expect(observe(incomplete)).rejects.toThrow('lifecycle fields');
      await expect(dispatch()).rejects.toThrow('planning-observation-stale');
    }
    await observe({ ...issue(), [field]: new Date(now).toISOString() });
    await expect(dispatch()).rejects.toThrow('revoked');
  });

  it.each([
    'https://example.test/file?signature=first',
    'http://uploads.linear.app/file?signature=first',
    'https://uploads.linear.app:8443/file?signature=first',
    'https://user@uploads.linear.app/file?signature=first',
    'https://uploads.linear.app.evil.test/file?signature=first',
    'https://uploads.linear.app/file?version=first',
    'a private artifact reference',
  ])('retains meaningful or unrecognized attachment reference %s', (url) => {
    expect(planningAttachmentReference(url)).toBe(url);
  });

  it('fails closed for ambiguous stages, archival, inaccessible data and stale observations', () => {
    const binding = createPlanningBinding(issue());
    for (const labels of [[], ['Approved', 'Deferred'], ['Approved', 'Approved']]) {
      expect(evaluatePlanningObservation(binding, observation({ ...issue(), labels }), now).result).toBe('unverified');
    }
    expect(evaluatePlanningObservation(binding, observation({ ...issue(), archivedAt: new Date(now).toISOString() }), now).result).toBe('fail');
    expect(evaluatePlanningObservation(binding, observation(undefined, { status: 'unavailable', issue: undefined }), now).result).toBe('unverified');
    for (const observedAt of [0, now + 1, now - 60_001]) {
      expect(() => evaluatePlanningObservation(binding, observation(issue(), { observedAt }), now)).toThrow('fresh');
    }
  });
});

describe('planning scope lifecycle gates', () => {
  it('requires existing request authority even when the planning label says Approved', async () => {
    const { store, request } = await setup();
    await expect(store.enqueue({ ...request, requestId: 'bot-approved', authority: undefined })).rejects.toThrow('authority');
    await expect(store.enqueue({ ...request, requestId: 'different-approval', authority: { ...request.authority, planningRevision: 'another-revision' } })).rejects.toThrow('accepted planning revision');
  });

  it('requires a fresh scope read and rejects changed or removed bindings on duplicate intake', async () => {
    const { store, request, dispatch, observe } = await setup();
    await expect(dispatch()).rejects.toThrow('planning-observation-stale');
    await expect(store.enqueue({ ...request, planningBinding: undefined })).rejects.toThrow('different scope');
    const changedBinding = createPlanningBinding({ ...issue(), description: 'Different option' });
    await expect(store.enqueue({ ...request, planningBinding: changedBinding, authority: { ...request.authority, planningRevision: changedBinding.revision } })).rejects.toThrow('different scope');
    await observe();
    expect((await dispatch()).nextDispatchAction).toBe('create');
  });

  it('blocks new work after withdrawal but preserves uncertain acknowledgements and checkpoints', async () => {
    const { act, observe, dispatch } = await setup();
    await observe();
    const intent = await dispatch();
    await observe({ ...issue(), labels: ['Deferred'] });
    expect((await dispatch()).nextDispatchAction).toBe('reconcile');
    await act('bind', { token: intent.dispatch.token, threadId: 'existing-worker' });
    await expect(act('reserve-followup', { events: ['new-review'] })).rejects.toThrow('revoked');
    await expect(act('transition', { state: 'investigating', reason: 'Start' })).rejects.toThrow('revoked');
    expect((await act('context', { context: { nextAction: 'Await maintainer decision.' } })).context.nextAction).toBe('Await maintainer decision.');
    expect((await act('release', { reason: 'Preserve unfinished work.' })).lease).toBeNull();
  });

  it('reconciles pending follow-ups after lost access without sending new ones', async () => {
    const { act, observe, dispatch } = await setup();
    await observe();
    const intent = await dispatch();
    await act('bind', { token: intent.dispatch.token, threadId: 'existing-worker' });
    const followup = await act('reserve-followup', { events: ['review-1'] });
    await observe(undefined, { status: 'unavailable', issue: undefined });
    expect((await act('reserve-followup', { events: ['review-1'] })).followupDecision.action).toBe('reconcile');
    await act('confirm-followup', { token: followup.followupDecision.token, threadId: 'existing-worker', reference: 'verified-service-receipt', observedAt: now });
    expect((await act('reserve-followup', { events: ['review-1'] })).followupDecision.action).toBe('skip');
    await expect(act('reserve-followup', { events: ['review-2'] })).rejects.toThrow('unverified');
  });

  it('blocks new resource allocation after withdrawal while preserving usage settlement', async () => {
    const { act, observe } = await setup({ bounded: true });
    await observe();
    await act('resource-usage', { usage: { modelTokens: 0, toolCalls: 0, reference: 'usage', observedAt: now } });
    const allocated = await act('reserve-resources', { event: 'operation-1', modelTokens: 20, toolCalls: 1 });
    await observe({ ...issue(), labels: ['Rejected'] });
    expect((await act('reserve-resources', { event: 'operation-1', modelTokens: 20, toolCalls: 1 })).resourceDecision.action).toBe('reconcile');
    await expect(act('reserve-resources', { event: 'operation-2', modelTokens: 20, toolCalls: 1 })).rejects.toThrow('revoked');
    await act('resource-usage', { usage: { modelTokens: 20, toolCalls: 1, reference: 'usage', observedAt: now }, settledReservations: [allocated.resourceDecision.reservation.token] });
  });

  it('retains the binding across restart and expires old planning observations', async () => {
    const { directory, observe, advance, dispatch } = await setup();
    await observe();
    const tasks = await new AgentTaskStore(directory, { now: () => now }).list();
    expect(planningStatus(tasks[0], now)).toMatchObject({ bound: true, result: 'pass' });
    advance(60_001);
    await expect(dispatch()).rejects.toThrow('stale');
  });

  it('rejects backward observations and stores no proposal text or attachment URLs', async () => {
    const { directory, act, observe, advance } = await setup();
    await observe();
    advance(10);
    await observe();
    await expect(act('planning-observation', { observation: observation() })).rejects.toThrow('backwards');
    const bytes = await readFile(path.join(directory, 'tasks.json'), 'utf8');
    expect(bytes).not.toContain(issue().description);
    expect(bytes).not.toContain(issue().attachments[0].url);
  });

  it('latches withdrawal so a later agent-authored Approved label cannot revive old authority', async () => {
    const { observe, dispatch } = await setup();
    await observe({ ...issue(), labels: ['Deferred'] });
    await expect(observe()).rejects.toThrow('timestamp tie');
    await expect(dispatch()).rejects.toThrow('revoked');
  });

  it('recovers a transient access failure without inventing a new approval', async () => {
    const { observe, dispatch, advance } = await setup();
    await observe(undefined, { status: 'unavailable', issue: undefined });
    await expect(dispatch()).rejects.toThrow('unverified');
    advance(1);
    await observe();
    expect((await dispatch()).nextDispatchAction).toBe('create');
  });

  it('preserves blocking planning observations across tied reads and restart', async () => {
    const { directory, task, store, observe, dispatch, advance } = await setup();
    await observe();
    await observe(undefined, { status: 'unavailable', issue: undefined });
    const previous = (await store.list())[0].planning.observation;
    const restarted = new AgentTaskStore(directory, { now: () => now });
    await restarted.mutate(task.id, 'planning-observation', { owner: 'coordinator',
      observation: observation(undefined, { status: 'unavailable', issue: undefined }) });
    await expect(restarted.mutate(task.id, 'planning-observation', { owner: 'coordinator', observation: observation() }))
      .rejects.toThrow('timestamp tie');
    expect((await store.list())[0].planning.observation).toEqual(previous);
    await expect(dispatch()).rejects.toThrow('unverified');
    advance(1);
    await observe();
    expect((await dispatch()).nextDispatchAction).toBe('create');
  });

  it('rechecks the planning revision separately from the request revision before dispatch', async () => {
    const { act, request, observe } = await setup();
    await observe();
    await expect(act('dispatch-intent', { authority: { ...request.authority, revision: request.revision, planningRevision: 'another-fingerprint' } })).rejects.toThrow('rechecked authority');
  });

  it('preserves the explicit-request path for tasks without a planning binding', async () => {
    const { dispatch } = await setup({ bound: false });
    expect((await dispatch()).nextDispatchAction).toBe('create');
  });

  it.each(['implement', 'steward', 'research', 'audit'])('blocks private-only %s execution even when it bypasses planning intake', async (mode) => {
    const { observe, dispatch, act, store } = await setup({ mode, visibility: 'private-planning' });
    await observe();
    await expect(dispatch()).rejects.toThrow('visibility approval');
    await expect(act('transition', { state: 'investigating', reason: 'Attempt delivery.' })).rejects.toThrow('visibility approval');
    expect((await store.list())[0]).toMatchObject({ state: 'queued', dispatch: null });
  });

  it('fails closed on an existing planning-bound request with no visibility decision', async () => {
    const { directory, task, store, observe, request } = await setup();
    // Simulate the pre-visibility record format, without changing its accepted request identity.
    await store.transaction((state) => { delete state.tasks[0].brief.visibility; });
    await observe();
    const restarted = new AgentTaskStore(directory, { now: () => now });
    await expect(restarted.mutate(task.id, 'dispatch-intent', { owner: 'coordinator',
      authority: { ...request.authority, revision: request.revision } })).rejects.toThrow('visibility approval');
    expect((await restarted.list())[0].dispatch).toBeNull();
  });

  it('blocks fresh follow-ups and delivery transitions for a legacy private implementation', async () => {
    const { directory, task, store, observe, act } = await setup({ visibility: 'private-planning' });
    await observe();
    await store.transaction((state) => {
      state.tasks[0].state = 'verifying';
      state.tasks[0].dispatch = { token: 'legacy-dispatch', threadId: 'legacy-worker', clientThreadId: null };
    });
    await expect(act('reserve-followup', { events: ['new-review-finding'] })).rejects.toThrow('visibility approval');
    await expect(act('transition', { state: 'delivered', reason: 'Attempt completion.' })).rejects.toThrow('visibility approval');
    const restarted = new AgentTaskStore(directory, { now: () => now });
    await expect(restarted.mutate(task.id, 'transition', { owner: 'coordinator', state: 'building',
      reason: 'Attempt repair.' })).rejects.toThrow('visibility approval');
    const unchanged = (await restarted.list())[0];
    expect(unchanged.state).toBe('verifying');
    expect(unchanged).not.toHaveProperty('followups');
  });
});
