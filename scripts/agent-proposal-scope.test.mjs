import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlanningBinding, requirePlanningScope } from './agent-planning-scope.mjs';
import { AgentTaskStore } from './agent-task-store.mjs';
import { enqueueProposalRequest, evaluateProposalObservation, requireProposalScope,
  validateProposalRequestObservation } from './agent-proposal-scope.mjs';

const now = 1_000_000;
const directories = [];
const issue = () => ({ uuid: 'idea', teamId: 'team', projectId: 'project', title: 'A maintainer idea',
  description: 'Investigate this idea and develop options.', attachments: [], labels: ['Captured'],
  archivedAt: null, canceledAt: null });
const binding = createPlanningBinding(issue());
const observe = (value = issue(), extra = {}) => ({ status: 'available', issue: value,
  observedAt: now, reference: 'linear:complete-read', ...extra });
const request = () => ({ source: 'maintainer-idea', requestId: 'human-event-1', mode: 'research', revision: 'idea-scope-1',
  proposalBinding: binding, authority: { kind: 'maintainer-idea-request', actor: 'maintainer',
    reference: 'verified-human-event', revision: 'idea-scope-1', proposalRevision: binding.revision, observedAt: now },
  brief: { purpose: 'proposal-development', visibility: 'private-planning', resultDestination: 'linear-proposal',
    destination: { kind: 'linear', issueId: binding.issueId, teamId: binding.teamId, projectId: binding.projectId },
    selectedOption: 'Develop evidence and options', permittedChanges: ['Private proposal artifacts only'],
    acceptanceCriteria: ['Sourced options and appropriate prototype evidence'] } });
const identity = { source: 'maintainer-idea', requestId: 'human-event-1' };
const validate = (value = request(), extra = {}) => validateProposalRequestObservation(
  { status: 'authorized', request: value, ...extra }, identity, now, now);
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

// New contract tests: exact stage/authority/destination boundaries and durable duplicate intake.
describe('private proposal development authority', () => {
  it.each(['Captured', 'Developing proposal'])('allows %s without approval or public visibility', (stage) => {
    const value = { ...issue(), labels: [stage, 'type: idea'], priority: 1, createdById: 'agent' };
    const observation = evaluateProposalObservation(binding, observe(value), now);
    expect(observation).toMatchObject({ result: 'pass', stage, revision: binding.revision });
    const task = { ...request(), proposal: { binding, observation } };
    requireProposalScope(task, now);
    expect(validate()).not.toHaveProperty('planningBinding');
    expect(validate().authority).not.toHaveProperty('planningRevision');
  });

  it.each(['Ready for prioritization', 'Approved', 'In delivery', 'Validated', 'Needs evidence',
    'Deferred', 'Rejected', 'Superseded'])('stops new discovery at %s', (stage) => {
    expect(evaluateProposalObservation(binding, observe({ ...issue(), labels: [stage] }), now).result).toBe('fail');
  });

  it('fails closed on withdrawal, changed content, ambiguous labels and inaccessible reads', () => {
    for (const value of [{ ...issue(), description: 'Changed selected idea' },
      { ...issue(), archivedAt: new Date(now).toISOString() }, { ...issue(), canceledAt: new Date(now).toISOString() }]) {
      expect(evaluateProposalObservation(binding, observe(value), now).result).toBe('fail');
    }
    for (const labels of [[], ['Captured', 'Approved'], ['Captured', 'Captured']]) {
      expect(evaluateProposalObservation(binding, observe({ ...issue(), labels }), now).result).toBe('unverified');
    }
    expect(evaluateProposalObservation(binding, observe(undefined, { status: 'unavailable' }), now).result).toBe('unverified');
    expect(evaluateProposalObservation(binding, { status: 'missing', issueId: binding.issueId,
      reference: 'linear:missing', observedAt: now }, now).result).toBe('fail');
    expect(() => evaluateProposalObservation(binding, observe(issue(), { observedAt: now - 60_001 }), now)).toThrow('fresh');
  });

  it('rejects bot approval, delivery modes, public destinations and identity mismatch', () => {
    for (const value of [{ ...request(), mode: 'implement' }, { ...request(), mode: 'audit' },
      { ...request(), planningBinding: binding }, { ...request(), authority: { ...request().authority, kind: 'agent-stage' } },
      { ...request(), authority: { ...request().authority, proposalRevision: 'changed' } }]) {
      expect(() => validate(value)).toThrow('maintainer idea request');
    }
    for (const brief of [{ ...request().brief, visibility: 'public-delivery-approved' },
      { ...request().brief, resultDestination: 'public-github' },
      { ...request().brief, destination: { ...request().brief.destination, projectId: 'another' } },
      { ...request().brief, destination: { ...request().brief.destination, url: 'public' } }]) {
      expect(() => validate({ ...request(), brief })).toThrow('exact private Linear');
    }
    expect(() => validate(request(), { status: 'withdrawn' })).toThrow('not authorized');
    expect(() => validate({ ...request(), requestId: 'different' })).toThrow('identity mismatch');
    expect(() => validate({ ...request(), authority: { ...request().authority, observedAt: now - 1 } })).toThrow('fresh authority');
  });

  it('does not relax the shared delivery queue privacy guard', () => {
    const task = { ...request(), planning: { binding,
      observation: { result: 'pass', reason: 'planning-scope-current', observedAt: now } } };
    expect(() => requirePlanningScope(task, now)).toThrow('public visibility');
    expect(() => requireProposalScope({ ...task, proposal: { binding,
      observation: evaluateProposalObservation(binding, observe(), now) } }, now)).toThrow('shared delivery');
  });

  it('requires fresh bound scope and retains withdrawal gates', () => {
    const task = { ...request(), proposal: { binding, observation: evaluateProposalObservation(binding, observe(), now) } };
    expect(() => requireProposalScope(task, now + 60_001)).toThrow('stale');
    expect(() => requireProposalScope({ ...task, requestRevocation: { status: 'withdrawn' } }, now)).toThrow('withdrawn');
    expect(() => requireProposalScope({ ...task, proposal: { ...task.proposal, revokedAt: now } }, now)).toThrow('withdrawn');
    expect(() => requireProposalScope({ ...task, proposal: { ...task.proposal,
      observation: { ...task.proposal.observation, revision: 'changed' } } }, now)).toThrow('blocks execution');
  });
});

describe('proposal intake reuses durable task ownership', () => {
  async function setup() {
    const directory = await mkdtemp(path.join(tmpdir(), 'navet-proposal-scope-'));
    directories.push(directory);
    const store = new AgentTaskStore(directory, { now: () => now });
    return { store, directory, options: { store, identity, readIssue: async () => observe(),
      readRequest: async () => ({ status: 'authorized', request: request() }), now: () => now } };
  }

  it('deduplicates across restart and keeps observations empty until execution', async () => {
    const { store, directory, options } = await setup();
    const first = await enqueueProposalRequest(options);
    const restarted = new AgentTaskStore(directory, { now: () => now });
    expect((await enqueueProposalRequest({ ...options, store: restarted })).id).toBe(first.id);
    expect((await store.list())).toHaveLength(1);
    expect(first.proposal).toEqual({ binding, observation: null });
    expect(first).not.toHaveProperty('planning');
    await expect(store.enqueue({ ...request(), brief: { ...request().brief, selectedOption: 'Different request' } }))
      .rejects.toThrow('different scope');
  });

  it('stores withdrawal across restart and blocks private execution after a stale or unavailable read', async () => {
    const { store, directory, options } = await setup();
    const task = await enqueueProposalRequest(options);
    const act = (action, input = {}) => store.mutate(task.id, action, { owner: 'coordinator', ...input });
    await act('claim', { durationMs: 300_000 });
    await expect(act('dispatch-intent', { authority: request().authority })).rejects.toThrow('stale');
    await act('proposal-observation', { observation: observe(undefined, { status: 'unavailable' }) });
    await expect(act('dispatch-intent', { authority: request().authority })).rejects.toThrow('blocks execution');
    const restarted = new AgentTaskStore(directory, { now: () => now + 1 });
    await restarted.mutate(task.id, 'proposal-observation', { owner: 'coordinator',
      observation: observe({ ...issue(), labels: ['Deferred'] }, { observedAt: now + 1 }) });
    await expect(restarted.mutate(task.id, 'dispatch-intent', { owner: 'coordinator',
      authority: { ...request().authority, observedAt: now + 1 } })).rejects.toThrow('withdrawn');
    expect((await restarted.list())[0].proposal.revokedAt).toBeTruthy();
    expect((await restarted.list())[0].dispatch).toBeNull();
  });

  it('rechecks human authority after the issue read and rejects unavailable or changed source', async () => {
    const { store, options } = await setup();
    let reads = 0;
    await expect(enqueueProposalRequest({ ...options, readRequest: async () => ++reads === 1
      ? { status: 'authorized', request: request() } : { status: 'withdrawn', request: request() } }))
      .rejects.toThrow('not authorized');
    await expect(enqueueProposalRequest({ ...options, readIssue: async () => observe(undefined, { status: 'unavailable' }) }))
      .rejects.toThrow('planning-access-unverified');
    await expect(enqueueProposalRequest({ ...options, readIssue: async () => observe({ ...issue(), description: 'Changed' }) }))
      .rejects.toThrow('planning-scope-changed');
    expect(await store.list()).toEqual([]);
  });
});
