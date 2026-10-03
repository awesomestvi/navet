import { describe, expect, it } from 'vitest';
import { createLinearResultWriter } from './agent-linear-result-writer.mjs';
import { linearResultBodyHash } from './agent-linear-result-reader.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const time = 1_700_000_000_000;
const policy = { organizationId: id(1), appUserId: id(2), teamId: id(3), projectId: id(4) };
const body = 'Research result for the exact approved journey.';
function setup(options = {}) {
  const issue = { id: id(5), teamId: policy.teamId, projectId: policy.projectId, title: 'Approved journey',
    description: 'Investigate controls and document the evidence.', attachments: [], labels: ['Approved'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const authority = { actor: 'maintainer', reference: 'trusted-request', revision: 'scope', planningRevision: binding.revision, observedAt: time };
  const brief = { selectedOption: 'Research', permittedChanges: ['Return one research result to Linear.'],
    resultDestination: 'linear-planning', visibility: 'public-delivery-approved', acceptanceCriteria: ['Show reproduction and options.'] };
  const request = { source: 'trusted-source', requestId: 'event', mode: 'research', revision: 'scope', planningBinding: binding,
    authority, brief, requiredGates: ['output'] };
  const receipt = { status: 'pending', commentId: id(6), issueId: issue.id, bodyHash: linearResultBodyHash(body),
    writerAppUserId: policy.appUserId, intentAt: time, head: null, revision: request.revision, planningRevision: binding.revision };
  const task = { ...request, id: 'saved-task', state: 'verifying', head: null, dispatch: { threadId: 'worker', intentAt: time }, planningResult: receipt,
    planning: { binding, observation: { result: 'pass', observedAt: time, reference: 'live-scope' } } };
  delete task.planningBinding;
  const destination = () => ({ organization: { id: policy.organizationId }, viewer: { id: policy.appUserId, app: true, active: true },
    issue: { id: issue.id, team: { id: policy.teamId }, project: { id: policy.projectId }, archivedAt: null, canceledAt: null,
      updatedAt: new Date(time).toISOString(), syncedWith: [] } });
  const acknowledgement = () => ({ commentCreate: { success: true, comment: { id: receipt.commentId,
    issue: { id: issue.id, team: { id: policy.teamId }, project: { id: policy.projectId } },
    user: { id: policy.appUserId, app: true, active: true } } } });
  const calls = [];
  const order = [];
  const write = createLinearResultWriter({ policy, now: () => time,
    getAccessToken: async () => 'synthetic-writer-token',
    readIssue: async () => { order.push('scope'); return { status: 'available', issue, observedAt: time, reference: 'linear-read' }; },
    readRequest: async () => { order.push('authority'); return { status: 'authorized', request }; },
    beginWrite: async () => { order.push('reserve'); return { action: 'send', receipt: { ...receipt, attemptedAt: time } }; },
    fetchImpl: async (url, init) => {
      const payload = JSON.parse(init.body);
      calls.push({ url, init, payload });
      const mutation = payload.query.startsWith('mutation');
      order.push(mutation ? 'create' : 'destination');
      return Response.json({ data: mutation ? acknowledgement() : destination() });
    }, ...options });
  const input = { task, decision: { action: 'create', receipt: structuredClone(receipt) }, body };
  return { write, input, issue, request, destination, acknowledgement, calls, order };
}

describe('bounded app-actor Linear result writer', () => {
  it('checks destination, complete scope and human authority before one exact comment creation', async () => {
    const { write, input, calls, order } = setup();
    const result = await write(input);
    expect(result).toEqual({ status: 'acknowledged', commentId: id(6), observedAt: time });
    expect(order).toEqual(['destination', 'scope', 'destination', 'authority', 'reserve', 'create']);
    expect(calls).toHaveLength(3);
    for (const call of calls) expect(call).toMatchObject({ url: 'https://api.linear.app/graphql',
      init: { method: 'POST', redirect: 'error', cache: 'no-store' } });
    expect(calls[2].payload.variables).toEqual({ input: { id: id(6), issueId: id(5), body,
      createOnSyncedSlackThread: false, doNotSubscribeToIssue: true } });
    expect(calls[2].payload.query).not.toMatch(/organization|viewer/);
    expect(JSON.stringify(result)).not.toMatch(/Research result|synthetic-writer-token/);
    expect((await write(input)).reason).toBe('result-write-session-consumed');
    expect(calls).toHaveLength(3);
  });

  it.each([
    (v) => { v.organization.id = id(9); },
    (v) => { v.viewer.id = id(9); },
    (v) => { v.viewer.app = false; },
    (v) => { v.viewer.active = false; },
    (v) => { v.issue.team.id = id(9); },
    (v) => { v.issue.project.id = id(9); },
    (v) => { v.issue.syncedWith = [{ __typename: 'ExternalEntityInfo' }]; },
    (v) => { v.issue.syncedWith = null; },
    (v) => { v.issue.archivedAt = new Date(time).toISOString(); },
    (v) => { delete v.issue.canceledAt; },
  ])('blocks mismatched or externally synced destinations before mutation %#', async (change) => {
    let mutations = 0;
    const base = setup();
    const { write, input } = setup({ fetchImpl: async (_, init) => {
      if (JSON.parse(init.body).query.startsWith('mutation')) mutations++;
      const value = base.destination(); change(value);
      return Response.json({ data: value });
    } });
    expect((await write(input)).status).toBe('blocked');
    expect(mutations).toBe(0);
  });

  it('blocks complete proposal changes and human withdrawal after the preflight', async () => {
    const base = setup();
    for (const options of [
      { readIssue: async () => ({ status: 'available', issue: { ...base.issue, description: 'Changed scope.' }, observedAt: time, reference: 'read' }) },
      { readRequest: async () => ({ status: 'withdrawn' }) },
      { readRequest: async () => ({ status: 'authorized', request: { ...base.request, brief: { ...base.request.brief, permittedChanges: ['Changed changes.'] } } }) },
      { readRequest: async () => ({ status: 'authorized', request: { ...base.request, requiredGates: ['new-gate'] } }) },
    ]) {
      const { write, input, calls } = setup(options);
      expect((await write(input)).status).toBe('blocked');
      expect(calls.every((call) => !call.payload.query.startsWith('mutation'))).toBe(true);
    }
  });

  it('rejects destination changes between preflights', async () => {
    const base = setup();
    let calls = 0;
    const { write, input } = setup({ fetchImpl: async () => {
      const value = base.destination();
      if (++calls === 2) value.issue.updatedAt = new Date(time + 1).toISOString();
      return Response.json({ data: value });
    } });
    expect((await write(input)).status).toBe('blocked');
    expect(calls).toBe(2);
  });

  it.each([
    (v) => { v.decision.action = 'skip'; },
    (v) => { v.body = 'Changed result'; },
    (v) => { v.task.brief.visibility = 'private-planning'; },
    (v) => { v.task.planningResult.head = 'other'; },
    (v) => { v.task.planningResult.intentAt = 1; },
    (v) => { v.task.planning.revokedAt = time; },
    (v) => { v.task.state = 'delivered'; },
  ])('rejects unsafe or non-create intents before acquiring credentials %#', async (change) => {
    let acquired = 0;
    const { write, input } = setup({ getAccessToken: async () => { acquired++; return 'token'; } });
    change(input);
    expect((await write(input)).status).toBe('blocked');
    expect(acquired).toBe(0);
  });

  it('can reconcile a reserved but never-attempted intent only through the durable first-send permit', async () => {
    const { write, input } = setup();
    input.decision.action = 'reconcile';
    expect((await write(input)).status).toBe('acknowledged');
    const replay = setup();
    replay.input.task.planningResult.attemptedAt = time;
    replay.input.decision.receipt.attemptedAt = time;
    replay.input.decision.action = 'reconcile';
    expect((await replay.write(replay.input)).status).toBe('blocked');
    expect(replay.calls).toHaveLength(0);
  });

  it('recovers older unattempted intents using fresh source reads without renewing the reserved timestamp', async () => {
    const base = setup();
    const later = time + 60_001;
    const { write, input } = setup({ now: () => later,
      readIssue: async () => ({ status: 'available', issue: base.issue, observedAt: later, reference: 'fresh-scope' }),
      readRequest: async () => ({ status: 'authorized', request: { ...base.request,
        authority: { ...base.request.authority, observedAt: later } } }),
      beginWrite: async () => ({ action: 'send', receipt: { ...base.input.task.planningResult, attemptedAt: later } }) });
    input.task.planning.observation.observedAt = later;
    input.decision.action = 'reconcile';
    expect((await write(input)).status).toBe('acknowledged');
    expect(input.task.planningResult.intentAt).toBe(time);
  });

  it.each(['transport', 'response', 'identity', 'success'])('treats %s failure after mutation as uncertain and never retries', async (kind) => {
    const base = setup();
    let mutations = 0;
    const { write, input } = setup({ fetchImpl: async (_, init) => {
      if (!JSON.parse(init.body).query.startsWith('mutation')) return Response.json({ data: base.destination() });
      mutations++;
      if (kind === 'transport') throw new Error('private transport details');
      if (kind === 'response') return Response.json({ errors: [{ message: 'private GraphQL error' }] });
      const value = base.acknowledgement();
      if (kind === 'identity') value.commentCreate.comment.user.app = false;
      if (kind === 'success') value.commentCreate.success = false;
      return Response.json({ data: value });
    } });
    expect(await write(input)).toEqual({ status: 'uncertain', reason: 'result-write-requires-reconciliation' });
    expect((await write(input)).status).toBe('blocked');
    expect(mutations).toBe(1);
  });

  it('bounds a stuck mutation and refuses overlapping writes in one session', async () => {
    const base = setup();
    let mutations = 0;
    const { write, input } = setup({ maxWriteMs: 15, fetchImpl: async (_, init) => {
      if (!JSON.parse(init.body).query.startsWith('mutation')) return Response.json({ data: base.destination() });
      mutations++;
      return new Promise(() => {});
    } });
    const first = write(input);
    expect((await write(input)).reason).toBe('result-write-session-consumed');
    expect((await first).status).toBe('uncertain');
    expect(mutations).toBe(1);
  });

  it('bounds credential and trusted-reader stalls without issuing a mutation', async () => {
    for (const options of [{ getAccessToken: async () => new Promise(() => {}) },
      { readRequest: async () => new Promise(() => {}) }, { readIssue: async () => new Promise(() => {}) }]) {
      const { write, input, calls } = setup({ ...options, maxWriteMs: 10 });
      expect((await write(input)).status).toBe('blocked');
      expect(calls.every((call) => !call.payload.query.startsWith('mutation'))).toBe(true);
    }
  });

  it.each(['reconcile', 'missing', 'changed', 'lost'])('never posts when durable send reservation is %s', async (kind) => {
    let mutations = 0;
    const base = setup();
    const { write, input } = setup({ beginWrite: async () => {
      if (kind === 'lost') throw new Error('private store acknowledgement');
      if (kind === 'missing') return null;
      const receipt = { ...base.input.task.planningResult, attemptedAt: time };
      if (kind === 'changed') receipt.commentId = id(9);
      return { action: kind === 'reconcile' ? 'reconcile' : 'send', receipt };
    }, fetchImpl: async (_, init) => {
      if (JSON.parse(init.body).query.startsWith('mutation')) mutations++;
      return Response.json({ data: base.destination() });
    } });
    expect((await write(input)).status).toBe('uncertain');
    expect(mutations).toBe(0);
    expect((await write(input)).reason).toBe('result-write-session-consumed');
  });

  it('honors cancellation before acquisition and during trusted authority reads', async () => {
    const canceled = new AbortController();
    canceled.abort();
    const first = setup({ signal: canceled.signal });
    expect((await first.write(first.input)).status).toBe('blocked');
    expect(first.calls).toHaveLength(0);
    const running = new AbortController();
    const second = setup({ signal: running.signal, readRequest: async () => {
      running.abort(); return new Promise(() => {});
    } });
    expect((await second.write(second.input)).status).toBe('blocked');
    expect(second.calls.every((call) => !call.payload.query.startsWith('mutation'))).toBe(true);
  });

  it('cancels a running mutation without assuming it failed or attempting another write', async () => {
    const running = new AbortController();
    const base = setup();
    let mutationSignal;
    const { write, input } = setup({ signal: running.signal, fetchImpl: async (_, init) => {
      if (!JSON.parse(init.body).query.startsWith('mutation')) return Response.json({ data: base.destination() });
      mutationSignal = init.signal;
      running.abort();
      return new Promise(() => {});
    } });
    expect((await write(input)).status).toBe('uncertain');
    expect(mutationSignal.aborted).toBe(true);
    expect((await write(input)).reason).toBe('result-write-session-consumed');
  });

  it('rechecks closed or changed token sessions immediately before reserving a send', async () => {
    let acquired = 0;
    const { write, input, calls } = setup({ getAccessToken: async () => {
      if (++acquired > 1) throw new Error('session closed');
      return 'initial-token';
    } });
    expect((await write(input)).status).toBe('blocked');
    expect(calls.every((call) => !call.payload.query.startsWith('mutation'))).toBe(true);
  });
});
