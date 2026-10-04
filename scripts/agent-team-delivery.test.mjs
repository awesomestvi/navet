import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
import { linearResultBodyHash } from './agent-linear-result-reader.mjs';
import { finishTeamArtifact, acceptTeamDelivery } from './agent-team-delivery.mjs';
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function setup(proposal = false) {
  let time = 1_700_000_000_000; const now = () => time; const tick = () => ++time;
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-delivery-')); directories.push(directory);
  const store = new AgentTaskStore(directory, { now }); const owner = 'coordinator';
  const issue = { uuid: id(7), teamId: id(2), projectId: id(3), title: 'Private idea', description: 'Scope',
    attachments: [], labels: [proposal ? 'Captured' : 'Approved'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'human', requestId: proposal ? 'idea' : 'approved', revision: 'scope', mode: proposal ? 'research' : 'implement',
    ...(proposal ? { proposalBinding: binding } : { planningBinding: binding }),
    authority: { actor: id(6), reference: 'human:request', revision: 'scope', observedAt: time,
      ...(proposal ? { kind: 'maintainer-idea-request', proposalRevision: binding.revision } : { planningRevision: binding.revision }) },
    brief: { selectedOption: 'Selected option', permittedChanges: ['Authorized scope'], acceptanceCriteria: ['Intended behavior'],
      visibility: proposal ? 'private-planning' : 'public-delivery-approved',
      ...(proposal ? { purpose: 'proposal-development', resultDestination: 'linear-proposal',
        destination: { kind: 'linear', issueId: id(7), teamId: id(2), projectId: id(3) } } : {}) } };
  const task = await store.enqueue(request);
  const act = (action, input) => store.mutate(task.id, action, { owner, ...input });
  await act('claim', { durationMs: 100_000 });
  const policy = { organizationId: id(1), teamId: id(2), projectId: id(3), readerAppUserId: id(4), writerAppUserId: id(5), humanActorIds: [id(6)] };
  const identity = { taskId: task.id, issueId: id(7), scopeRevision: binding.revision, planRevision: 'plan-a',
    head: proposal ? null : 'head-a', revision: 'scope', phase: proposal ? 'proposal' : 'delivery' };
  const receipt = () => ({ status: 'available', reference: 'service:readback', observedAt: tick(), ...identity });
  const destination = () => ({ status: 'available', ...policy, issueId: id(7), readerIsApp: true, private: true, active: true, synced: false, observedAt: tick() });
  const writes = []; let available = true;
  const body = proposal ? 'source:observation Observed friction Keep current Selected option Owning module Compatibility Intended behavior private:prototype' : 'https://github.com/owner/repo/pull/1 https://preview.example check:behavior';
  const artifact = {
    body, bodyHash: linearResultBodyHash(body),
    manifest: { sources: ['source:observation'], findings: ['Observed friction'], options: ['Keep current', 'Selected option'],
      recommendedScope: 'Selected option', implementationSlices: ['Owning module'], risks: ['Compatibility'], acceptanceCriteria: ['Intended behavior'],
      unknowns: [], design: { status: 'applicable', references: ['private:prototype'], explanation: 'Sketch of intended interaction', states: ['empty', 'success', 'error'] } },
    pr: { ...receipt(), url: 'https://github.com/owner/repo/pull/1', state: 'open', draft: false, checks: 'pass', review: 'pass', unresolvedThreads: 0 },
    preview: { ...receipt(), url: 'https://preview.example', reachable: true, buildHead: 'head-a' },
    validation: [{ ...receipt(), criterion: 'Intended behavior', artifact: 'check:behavior', result: 'pass' }],
  };
  const adapters = {
    readIssue: async () => ({ status: 'available', issue: structuredClone(issue), reference: 'linear:issue', observedAt: tick() }),
    readRequest: async () => ({ status: 'authorized', request: { ...structuredClone(request), authority: { ...request.authority, observedAt: tick() } } }),
    readDestination: async () => destination(),
    readAuthority: async () => ({ ...receipt(), active: true, kind: proposal ? 'discovery' : 'implementation',
      actorIsApp: false, actorId: id(6), reference: 'human:request', expiresAt: time + 1000 }),
    writeUpdate: async (value) => { writes.push(value); },
    readUpdate: async (update) => writes.some((value) => value.receipt.updateId === update.updateId) && available
      ? { ...destination(), ...update, status: 'available', writerIsApp: true, onBehalfOf: null, url: 'https://linear.app/navet/issue/NAV-1', observedAt: tick() }
      : { status: available ? 'absent' : 'unavailable', observedAt: tick() },
    readAnswer: async () => ({ status: 'unavailable' }),
    readDelivery: async () => ({ ...structuredClone(artifact), ...receipt(),
      pr: { ...artifact.pr, observedAt: tick() }, preview: { ...artifact.preview, observedAt: tick() },
      validation: artifact.validation.map((item) => ({ ...item, observedAt: tick() })) }),
    readAcceptance: async () => ({ ...receipt(), prUrl: artifact.pr.url, actor: id(6), actorIsApp: false,
      result: 'accepted', kind: 'merge', merged: true, checks: 'pass', review: 'pass', unresolvedThreads: 0 }),
  };
  await act(proposal ? 'proposal-observation' : 'planning-observation', { observation: await adapters.readIssue() });
  if (!proposal) await act('head', { head: identity.head });
  const assignments = proposal ? [{ id: 'research', role: 'researcher', dependsOn: [], files: [], brief: { purpose: 'Sourced options' } }]
    : [{ id: 'build', role: 'developer', dependsOn: [], files: ['scripts/example.mjs'], brief: { purpose: 'Approved scope' } },
      { id: 'test', role: 'tester', dependsOn: ['build'], files: [], brief: { purpose: 'Intended behavior' } },
      { id: 'review', role: 'independent-reviewer', dependsOn: ['test'], files: [], brief: { purpose: 'Independent assessment' } }];
  await act('team-event', { event: { eventId: 'plan', type: 'plan', revision: identity.planRevision, phase: identity.phase, assignments } });
  for (const assignment of assignments) {
    const event = (value) => act('team-event', { event: value, authority: { ...request.authority, observedAt: tick() } });
    const intentId = assignment.id;
    await event({ eventId: `intent:${intentId}`, type: 'worker-intent', assignmentId: assignment.id, intentId });
    await event({ eventId: `attempt:${intentId}`, type: 'worker-attempt', intentId });
    await event({ eventId: `bind:${intentId}`, type: 'worker-bind', intentId, workerId: `worker:${intentId}` });
    await event({ eventId: `complete:${intentId}`, type: 'worker-observation', intentId,
      observation: { status: 'completed', reference: 'worker:result', observedAt: tick(), workerId: `worker:${intentId}` },
      evidence: [{ gate: assignment.role === 'independent-reviewer' ? 'independent-review' : 'focused-check', result: 'pass', artifact: 'check:behavior',
        head: identity.head, revision: identity.revision, observedAt: tick() }] });
  }
  return { store, task, act, now, tick, artifact, adapters, writes, directory, identity,
    setAvailable: (value) => { available = value; }, options: { store, owner, taskId: task.id, adapters, policy, now } };
}
it('publishes sourced private proposal evidence and verified stage once across restart', async () => {
  const h = await setup(true);
  expect(await finishTeamArtifact(h.options)).toMatchObject({ status: 'verified', taskId: h.task.id });
  expect(h.writes.map((item) => item.receipt.kind)).toEqual(['proposal', 'stage']);
  const restarted = new AgentTaskStore(h.directory, { now: h.now });
  expect(await finishTeamArtifact({ ...h.options, store: restarted })).toMatchObject({ status: 'verified' });
  expect(h.writes).toHaveLength(2);
  expect((await h.store.list())[0].team.status).toBe('awaiting-prioritization');
});
it('rejects a proposal boolean without findings and relevant design evidence', async () => {
  const h = await setup(true);
  const read = h.adapters.readDelivery;
  for (const change of [{ manifest: null, proposalComplete: true }, { manifest: { ...h.artifact.manifest, design: { status: 'not-applicable' } } },
    { manifest: { ...h.artifact.manifest, design: { ...h.artifact.manifest.design, references: ['unrelated:prototype'] } } }]) {
    expect(await finishTeamArtifact({ ...h.options, adapters: { ...h.adapters, readDelivery: async () => ({ ...await read(), ...change }) } }))
      .toMatchObject({ status: 'blocked', reason: 'delivery-readback-unverified' });
  }
  expect(h.writes).toHaveLength(0);
});
it('binds one PR, its deployed preview and each accepted criterion to current evidence then verifies human merge', async () => {
  const h = await setup();
  expect(await finishTeamArtifact(h.options)).toMatchObject({ status: 'verified' });
  expect((await h.store.list())[0].team.status).toBe('awaiting-review');
  expect(await acceptTeamDelivery(h.options)).toMatchObject({ status: 'acceptance-recorded' });
  expect(h.writes.map((item) => item.receipt.kind)).toEqual(['pr-evidence', 'stage', 'stage']);
  expect(await acceptTeamDelivery(h.options)).toMatchObject({ status: 'acceptance-recorded' });
  expect(h.writes).toHaveLength(3);
});
it('rejects stale preview, missing criterion, pending CI and mismatched service identity before linking', async () => {
  const h = await setup(); const read = h.adapters.readDelivery;
  for (const change of [
    (value) => ({ ...value, preview: { ...value.preview, buildHead: 'old-head' } }),
    (value) => ({ ...value, validation: [] }),
    (value) => ({ ...value, pr: { ...value.pr, checks: 'pending' } }),
    (value) => ({ ...value, issueId: id(8) }),
  ]) expect(await finishTeamArtifact({ ...h.options, adapters: { ...h.adapters, readDelivery: async () => change(await read()) } }))
    .toMatchObject({ status: 'blocked', reason: 'delivery-readback-unverified' });
  expect(h.writes).toHaveLength(0);
});
it('retains awaiting review on missing Linear readback and rejects agent or different-PR acceptance', async () => {
  const h = await setup();
  await finishTeamArtifact(h.options);
  const read = h.adapters.readAcceptance;
  for (const change of [{ actorIsApp: true }, { prUrl: 'https://github.com/owner/repo/pull/2' }, { head: 'old-head' }, { merged: false }]) {
    expect(await acceptTeamDelivery({ ...h.options, adapters: { ...h.adapters, readAcceptance: async () => ({ ...await read(), ...change }) } }))
      .toMatchObject({ status: 'blocked', reason: 'maintainer-acceptance-unverified' });
  }
  h.setAvailable(false);
  expect(await acceptTeamDelivery(h.options)).not.toMatchObject({ status: 'acceptance-recorded' });
  expect((await h.store.list())[0].team.status).not.toBe('accepted');
  h.setAvailable(true);
  expect(await acceptTeamDelivery(h.options)).toMatchObject({ status: 'acceptance-recorded' });
});
it('bounds cancellation and discards late reads without mutation or publication', async () => {
  const h = await setup(); let receivedSignal; let resolve; let entered;
  const entry = new Promise((done) => { entered = done; });
  const cancellation = new AbortController();
  const adapters = { ...h.adapters, readDelivery: async (_identity, { signal }) => {
    receivedSignal = signal; entered(); return new Promise((done) => { resolve = done; });
  } };
  const operation = finishTeamArtifact({ ...h.options, adapters, signal: cancellation.signal });
  await entry; cancellation.abort();
  expect(await operation).toMatchObject({ status: 'blocked' });
  expect(receivedSignal.aborted).toBe(true);
  resolve(await h.adapters.readDelivery());
  await new Promise((done) => setImmediate(done));
  expect((await h.store.list())[0].team.pr).toBeUndefined();
  expect(h.writes).toHaveLength(0);
});
it('rechecks the durable head after an owning-service read before saving its artifact', async () => {
  const h = await setup();
  const adapters = { ...h.adapters, readDelivery: async () => { const value = await h.adapters.readDelivery(); await h.act('head', { head: 'head-b' }); return value; } };
  expect(await finishTeamArtifact({ ...h.options, adapters })).toMatchObject({ status: 'blocked', reason: 'delivery-snapshot-changed' });
  expect(h.writes).toHaveLength(0);
});
