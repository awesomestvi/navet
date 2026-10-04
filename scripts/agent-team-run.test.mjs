import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterEach, expect, it } from 'vitest';
import { AgentTaskStore } from './agent-task-store.mjs';
import { createPlanningBinding } from './agent-planning-scope.mjs';
const execute = promisify(execFile);
const directories = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const entrypoint = path.resolve('scripts/agent-team-run.mjs');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function setup({ resources = true, stop = true, tickets = false } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-cli-')); directories.push(directory);
  const stateDirectory = path.join(directory, 'state');
  const moduleFile = path.join(directory, 'installed-adapter.mjs');
  const markerFile = path.join(directory, 'worker-created');
  const sessionFile = path.join(directory, 'native-coordinator.jsonl');
  const issue = { uuid: id(7), teamId: id(2), projectId: id(3), title: 'PRIVATE_IDEA_TITLE', description: 'PRIVATE_IDEA_DESCRIPTION',
    attachments: [], labels: ['Captured'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'human', requestId: 'idea', revision: 'scope', mode: 'research', proposalBinding: binding,
    ...(resources ? { resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 10_000, maxToolCalls: 100 } } : {}),
    authority: { actor: id(6), reference: 'PRIVATE_HUMAN_REQUEST', revision: 'scope', observedAt: Date.now(), kind: 'maintainer-idea-request', proposalRevision: binding.revision },
    brief: { selectedOption: 'PRIVATE_SELECTED_OPTION', permittedChanges: ['Private planning artifacts'], acceptanceCriteria: ['Sourced options'], visibility: 'private-planning',
      purpose: 'proposal-development', resultDestination: 'linear-proposal', destination: { kind: 'linear', issueId: binding.issueId, teamId: binding.teamId, projectId: binding.projectId } } };
  await writeFile(moduleFile, `import { readFile, writeFile } from 'node:fs/promises';
import { linearResultBodyHash } from ${JSON.stringify(path.resolve('scripts/agent-linear-result-reader.mjs'))};
const request = ${JSON.stringify(request)};
const issue = ${JSON.stringify(issue)};
const ticketPolicy = ${JSON.stringify({ organizationId: id(1), teamId: id(2), projectId: id(3), readerAppUserId: id(4), writerAppUserId: id(5), humanActorIds: [id(6)] })};
const ticketFile = ${JSON.stringify(path.join(directory, 'ticket-update.json'))};
const destination = () => ({ ...ticketPolicy, status: 'available', issueId: issue.uuid, readerIsApp: true, private: true, active: true, synced: false, observedAt: Date.now() });
export async function createTeamAdapters() {
 return {
  leaseDurationMs: 100000,
  ${tickets ? `ticketPolicy,
  readDestination: async () => destination(),
  readAuthority: async (receipt) => ({ status: 'available', taskId: receipt.taskId, issueId: receipt.issueId, scopeRevision: receipt.scopeRevision,
    active: true, kind: 'discovery', actorIsApp: false, actorId: ticketPolicy.humanActorIds[0], reference: request.authority.reference, expiresAt: Date.now() + 100000, observedAt: Date.now() }),
  writeUpdate: async (update) => writeFile(ticketFile, JSON.stringify(update)),
  readUpdate: async (receipt) => {
    let saved; try { saved = JSON.parse(await readFile(ticketFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return saved?.receipt.updateId === receipt.updateId ? { ...destination(), ...saved.receipt, status: 'available', writerIsApp: true, onBehalfOf: null, url: 'https://linear.app/navet/issue/NAV-1', observedAt: Date.now() }
      : { status: 'absent', observedAt: Date.now() };
  },
  readAnswer: async ({ receipt, answerId }) => {
    await new Promise(resolve => setTimeout(resolve, 2));
    const text = 'PRIVATE_VERIFIED_ANSWER';
    return { ...destination(), answerId, questionId: receipt.questionId, questionUpdateId: receipt.updateId, taskId: receipt.taskId,
      scopeRevision: receipt.scopeRevision, actorIsApp: false, actorId: ticketPolicy.humanActorIds[0], onBehalfOf: null,
      scopeChanged: false, reference: 'private:answer', createdAt: Date.now(), observedAt: Date.now(), text, bodyHash: linearResultBodyHash(text) };
  },` : ''}
  ${stop ? 'maxStopAttempts: 1, interruptWorker: async () => ({ status: "requested" }),' : ''}
  readIssue: async () => ({ status: 'available', issue, reference: 'private:issue', observedAt: Date.now() }),
  readRequest: async () => ({ status: 'authorized', request: { ...request, authority: { ...request.authority, observedAt: Date.now() } } }),
  createWorker: async () => { await writeFile(${JSON.stringify(markerFile)}, 'PRIVATE_WORKER_CREATED'); return { workerId: 'specialist-worker' }; },
  findWorker: async () => ({ status: 'unavailable' }),
  readWorker: async (identity) => ({ ...identity, status: 'running', reference: 'private:worker', observedAt: Date.now() }),
  readTeamInventory: async (identity) => ({ status: 'verified', complete: true, ...identity, reference: 'native:inventory', observedAt: Date.now(), phase: 'active',
   policy: { status: 'accepted', unit: 'native-observed-operations-v1', taskRevision: 'scope', reference: 'accepted:fixture-policy' },
   members: [{ role: 'coordinator', threadId: 'coordinator', runId: 'coordinator-turn', status: 'running', dedicated: true, sessionFile: ${JSON.stringify(sessionFile)} }] })
 };
}
`);
  const writeSession = async () => {
    const now = Date.now();
    const event = (type, at, payload) => ({ type: 'event_msg', timestamp: new Date(at).toISOString(), payload: { type, ...payload } });
    const lines = [{ type: 'session_meta', payload: { id: 'coordinator', base_instructions: 'PRIVATE_NATIVE_PROMPT' } },
      event('task_started', now - 10, { turn_id: 'coordinator-turn' }),
      { type: 'response_item', payload: { type: 'custom_tool_call', call_id: 'fixture:read', input: 'PRIVATE_TOOL_ARGUMENTS' } },
      event('token_count', now, { info: { total_token_usage: { input_tokens: 99, output_tokens: 1, cached_input_tokens: 0, reasoning_output_tokens: 0, total_tokens: 100 } } })];
    await writeFile(sessionFile, lines.map((line) => JSON.stringify(line)).join('\n') + '\n');
  };
  let sequence = 0;
  const invoke = async (input) => {
    const inputFile = path.join(directory, `operation-${sequence++}.json`);
    await writeFile(inputFile, JSON.stringify(input));
    try {
      const result = await execute(process.execPath, [entrypoint, stateDirectory, inputFile], {
        env: { ...process.env, CODEX_THREAD_ID: 'coordinator', NAVET_TEAM_ADAPTER_MODULE: moduleFile }, timeout: 10_000 });
      expect(result.stdout + result.stderr).not.toContain('PRIVATE_');
      return { code: 0, ...result, value: JSON.parse(result.stdout) };
    } catch (error) {
      expect(error.stdout + error.stderr).not.toContain('PRIVATE_');
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  };
  const intake = await invoke({ operation: 'proposal-intake', identity: { source: 'human', requestId: 'idea' } });
  expect(intake.code).toBe(0);
  const taskId = intake.value.taskId;
  expect(taskId).toBeTruthy();
  expect((await invoke({ operation: 'claim', taskId })).code).toBe(0);
  const store = new AgentTaskStore(stateDirectory);
  return { invoke, store, taskId, markerFile, writeSession, directory };
}
const plan = { eventId: 'plan:one', type: 'plan', revision: 'plan-a', phase: 'proposal', assignments: [
  { id: 'research', role: 'researcher', dependsOn: [], files: [], brief: { purpose: 'Sourced private options' } },
] };
const context = { worktree: '/private/fixture-worktree', branch: 'fixture/team', nextAction: 'Develop private proposal' };
it('runs actual CLI intake, ownership, plan, context, native usage and reserved specialist handoff with persisted safe output', async () => {
  const h = await setup();
  expect((await h.invoke({ operation: 'plan', taskId: h.taskId, event: plan })).code).toBe(0);
  expect((await h.invoke({ operation: 'context', taskId: h.taskId, context })).code).toBe(0);
  await h.writeSession();
  expect((await h.invoke({ operation: 'usage', taskId: h.taskId })).value).toMatchObject({ status: 'verified' });
  const reservation = await h.invoke({ operation: 'reserve', taskId: h.taskId, eventId: 'worker:research', modelTokens: 100, toolCalls: 1 });
  expect(reservation.code).toBe(0); expect(reservation.value.resourceToken).toBeTruthy();
  expect((await h.invoke({ operation: 'step', taskId: h.taskId, resourceToken: reservation.value.resourceToken })).value).toMatchObject({ status: 'bound' });
  const saved = (await h.store.list())[0];
  expect(saved.context).toMatchObject(context);
  expect(saved.resources.usage).toMatchObject({ modelTokens: 100, toolCalls: 1 });
  expect(saved.resources.accounting.members).toHaveLength(1);
  expect(saved.team.workers).toHaveLength(1);
  expect(saved.team.workers[0]).toMatchObject({ workerId: 'specialist-worker', status: 'running', role: 'researcher' });
  expect(await readFile(h.markerFile, 'utf8')).toBe('PRIVATE_WORKER_CREATED');
});
it.each(['resources', 'recovery', 'stop'])('rejects missing accepted %s configuration before creating a worker', async (missing) => {
  const h = await setup({ resources: missing !== 'resources', stop: missing !== 'stop' });
  expect((await h.invoke({ operation: 'plan', taskId: h.taskId, event: plan })).code).toBe(0);
  if (missing !== 'recovery') expect((await h.invoke({ operation: 'context', taskId: h.taskId, context })).code).toBe(0);
  const result = await h.invoke({ operation: 'step', taskId: h.taskId });
  expect(result.code).toBe(1);
  expect(result.stderr).toContain('Team operation unavailable');
  await expect(readFile(h.markerFile, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  expect((await h.store.list())[0].team?.workers ?? []).toHaveLength(0);
});

it('returns the question update ID for a subsequent CLI answer without exposing ticket contents', async () => {
  const h = await setup({ tickets: true });
  expect((await h.invoke({ operation: 'plan', taskId: h.taskId, event: plan })).code).toBe(0);
  await h.writeSession();
  expect((await h.invoke({ operation: 'usage', taskId: h.taskId })).value.status).toBe('verified');
  const reservation = await h.invoke({ operation: 'reserve', taskId: h.taskId, eventId: 'ticket:question', modelTokens: 0, toolCalls: 1 });
  const question = await h.invoke({ operation: 'ticket-update', taskId: h.taskId, kind: 'question', questionId: 'question-a',
    body: 'PRIVATE_QUESTION', resourceToken: reservation.value.resourceToken });
  expect(question.code).toBe(0);
  expect(question.value).toMatchObject({ status: 'verified', updateId: expect.any(String) });
  const answer = await h.invoke({ operation: 'ticket-answer', taskId: h.taskId, updateId: question.value.updateId, answerId: id(9) });
  expect(answer.code).toBe(0);
  expect(answer.value).toMatchObject({ status: 'resumed', taskId: h.taskId });
  expect((await h.store.list())[0].team.questions[0].answer.text).toBe('PRIVATE_VERIFIED_ANSWER');
});
