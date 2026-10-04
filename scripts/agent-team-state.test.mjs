import assert from 'node:assert/strict';
import { test } from 'vitest';
import { applyTeamEvent, teamPlanComplete } from './agent-team-state.mjs';
const now = 100_000;
const task = () => ({ head: 'head', revision: 'revision', planning: { binding: { revision: 'scope' } }, authority: { actor: 'maintainer' } });
const assignment = (id, role = 'researcher', dependsOn = [], files = []) => ({ id, role, dependsOn, files, brief: { acceptance: ['verified result'] } });
const event = (target, type, data, eventId = type) => applyTeamEvent(target, { eventId, type, ...data }, now);
const plan = (target, assignments, phase = 'proposal') => event(target, 'plan', { revision: 'plan1', phase, assignments });
function complete(target, id, workerId = id) {
  event(target, 'worker-intent', { assignmentId: id, intentId: id }, `${id}-intent`);
  event(target, 'worker-attempt', { intentId: id }, `${id}-attempt`);
  event(target, 'worker-bind', { intentId: id, workerId }, `${id}-bind`);
  event(target, 'worker-observation', { intentId: id,
    observation: { workerId, status: 'completed', observedAt: now, reference: `worker:${id}` },
    evidence: [{ gate: 'output', result: 'pass', artifact: `artifact:${id}`, head: target.head, revision: target.revision, observedAt: now }],
  }, `${id}-complete`);
}
test('plan validates dependency cycles and concurrent file ownership atomically', () => {
  const target = task();
  assert.throws(() => plan(target, [assignment('a', 'researcher', ['b']), assignment('b', 'researcher', ['a'])]), /cycle/);
  assert.equal(target.team, undefined);
  assert.throws(() => plan(target, [assignment('a', 'researcher', [], ['shared']), assignment('b', 'researcher', [], ['shared'])]), /overlap/);
  plan(target, [assignment('a', 'researcher', [], ['shared']), assignment('b', 'ux-designer', ['a'], ['shared'])]);
  assert.throws(() => event(target, 'worker-intent', { assignmentId: 'b', intentId: 'b' }), /dependencies/);
  complete(target, 'a'); complete(target, 'b');
  assert.equal(teamPlanComplete(target), true);
});
test('creation attempt is sent once and uncertain lookup never authorizes replacement', () => {
  const target = task(); plan(target, [assignment('a')]);
  event(target, 'worker-intent', { assignmentId: 'a', intentId: 'intent' });
  assert.equal(event(target, 'worker-attempt', { intentId: 'intent' }).action, 'send');
  assert.equal(event(target, 'worker-attempt', { intentId: 'intent' }).action, 'reconcile');
  assert.throws(() => event(target, 'worker-attempt', { intentId: 'intent' }, 'different'), /lookup/);
  assert.throws(() => event(target, 'worker-intent', { assignmentId: 'a', intentId: 'new' }, 'new'), /Reconcile/);
  event(target, 'worker-observation', { intentId: 'intent', observation: { status: 'missing', observedAt: now, reference: 'lookup' } });
  assert.throws(() => event(target, 'worker-intent', { assignmentId: 'a', intentId: 'new' }, 'new'), /Reconcile/);
});
test('event IDs reject changed payloads without modifying state', () => {
  const target = task(); plan(target, [assignment('a')]); const before = structuredClone(target.team);
  assert.throws(() => event(target, 'plan', { revision: 'changed', phase: 'proposal', assignments: [assignment('a')] }), /changed payload/);
  assert.deepEqual(target.team, before);
});
test('ticket waits and resumes only a fresh same-scope verified maintainer answer', () => {
  const target = task(); plan(target, [assignment('a')]);
  event(target, 'question', { questionId: 'q', text: 'Choose scope', reference: 'ticket:q', observedAt: now });
  assert.equal(target.team.status, 'awaiting-input');
  assert.throws(() => event(target, 'worker-intent', { assignmentId: 'a', intentId: 'a' }), /awaiting/);
  const answer = { verified: true, actor: 'agent', text: 'Answer', reference: 'ticket:a', observedAt: now, planningRevision: 'scope' };
  assert.throws(() => event(target, 'answer', { questionId: 'q', answer }), /Verified answer/);
  event(target, 'answer', { questionId: 'q', answer: { ...answer, actor: 'maintainer' } });
  assert.equal(target.team.status, 'developing-proposal');
});
test('PR requires independent worker and acceptance becomes stale at a different head', () => {
  const target = task(); plan(target, [assignment('build', 'developer'), assignment('review', 'independent-reviewer', ['build'])], 'delivery');
  complete(target, 'build', 'builder');
  event(target, 'worker-intent', { assignmentId: 'review', intentId: 'review' }, 'review-intent');
  event(target, 'worker-attempt', { intentId: 'review' }, 'review-attempt');
  assert.throws(() => event(target, 'worker-bind', { intentId: 'review', workerId: 'builder' }, 'review-bind'), /distinct worker/);
  event(target, 'worker-bind', { intentId: 'review', workerId: 'reviewer' }, 'review-bind');
  event(target, 'worker-observation', { intentId: 'review', observation: { workerId: 'reviewer', status: 'completed', observedAt: now, reference: 'review' },
    evidence: [{ gate: 'independent-review', result: 'pass', artifact: 'report', head: 'head', revision: 'revision', observedAt: now }] }, 'review-complete');
  event(target, 'pr', { url: 'https://github.com/o/r/pull/1', preview: 'https://preview', head: 'head', revision: 'revision', reference: 'PR readback', observedAt: now });
  assert.equal(target.team.status, 'awaiting-review');
  target.head = 'changed';
  assert.equal(teamPlanComplete(target), false);
  assert.throws(() => event(target, 'acceptance', { verified: true, result: 'accepted', head: 'changed', revision: 'revision', reference: 'review', observedAt: now }), /current-head/);
});
test('ticket update intent and attempts reconcile without resending', () => {
  const target = task(); const receipt = { updateId: 'u', bodyHash: 'hash', status: 'pending', attemptedAt: null };
  event(target, 'ticket-intent', { receipt });
  assert.equal(event(target, 'ticket-attempt', { updateId: 'u' }).action, 'send');
  assert.equal(event(target, 'ticket-attempt', { updateId: 'u' }, 'retry').action, 'reconcile');
  event(target, 'ticket-observation', { updateId: 'u', observation: { updateId: 'u', status: 'verified', observedAt: now } });
  assert.equal(target.team.updates[0].status, 'verified');
});
test('independent review cannot run before all developer and tester assignments', () => {
  const target = task();
  assert.throws(() => plan(target, [assignment('build', 'developer'), assignment('tests', 'tester', ['build']),
    assignment('review', 'independent-reviewer', ['build'])], 'delivery'), /every developer and tester/);
  assert.equal(target.team, undefined);
});
test.each([
  ['tester', 'scope'], ['tester', 'output'], ['independent-reviewer', 'scope'], ['independent-reviewer', 'output'],
])('%s cannot declare validation evidence applicable to %s', (role, applicability) => {
  const target = task();
  plan(target, [assignment('build', 'developer'), assignment('tests', 'tester', ['build']),
    assignment('review', 'independent-reviewer', ['tests'])], 'delivery');
  complete(target, 'build');
  const id = role === 'tester' ? 'tests' : 'review';
  if (role === 'independent-reviewer') complete(target, 'tests');
  event(target, 'worker-intent', { assignmentId: id, intentId: id }, `${id}-intent`);
  event(target, 'worker-attempt', { intentId: id }, `${id}-attempt`);
  event(target, 'worker-bind', { intentId: id, workerId: id }, `${id}-bind`);
  const before = structuredClone(target);
  assert.throws(() => event(target, 'worker-observation', { intentId: id,
    observation: { workerId: id, status: 'completed', observedAt: now, reference: `worker:${id}` },
    evidence: [{ gate: 'focused-validation', applicability, result: 'pass', artifact: `artifact:${id}`,
      head: target.head, revision: target.revision, observedAt: now }],
  }, `${id}-complete`), /head-sensitive/);
  assert.deepEqual(target, before);
});
test('proposal-bound ticket answers preserve the proposal revision', () => {
  const target = { ...task(), planning: undefined, proposal: { binding: { revision: 'proposal-scope' } } };
  plan(target, [assignment('a')]);
  event(target, 'question', { questionId: 'q', text: 'Choose design', reference: 'ticket:q', observedAt: now });
  assert.throws(() => event(target, 'answer', { questionId: 'q', answer: { verified: true, actor: 'maintainer',
    text: 'Answer', reference: 'ticket:a', observedAt: now, planningRevision: 'different' } }), /planning scope/);
  event(target, 'answer', { questionId: 'q', answer: { verified: true, actor: 'maintainer',
    text: 'Answer', reference: 'ticket:a', observedAt: now, planningRevision: 'proposal-scope' } });
  assert.equal(target.team.status, 'developing-proposal');
});
