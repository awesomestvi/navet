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
async function setup({ resources = true, stop = true } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-team-cli-')); directories.push(directory);
  const stateDirectory = path.join(directory, 'state');
  const moduleFile = path.join(directory, 'installed-adapter.mjs');
  const markerFile = path.join(directory, 'worker-created');
  const sessionFile = path.join(directory, 'native-coordinator.jsonl');
  const issue = { uuid: 'private-issue', teamId: 'private-team', projectId: 'private-project', title: 'PRIVATE_IDEA_TITLE', description: 'PRIVATE_IDEA_DESCRIPTION',
    attachments: [], labels: ['Captured'], archivedAt: null, canceledAt: null };
  const binding = createPlanningBinding(issue);
  const request = { source: 'human', requestId: 'idea', revision: 'scope', mode: 'research', proposalBinding: binding,
    ...(resources ? { resourceLimits: { maxElapsedMs: 100_000, maxModelTokens: 10_000, maxToolCalls: 100 } } : {}),
    authority: { actor: 'maintainer', reference: 'PRIVATE_HUMAN_REQUEST', revision: 'scope', observedAt: Date.now(), kind: 'maintainer-idea-request', proposalRevision: binding.revision },
    brief: { selectedOption: 'PRIVATE_SELECTED_OPTION', permittedChanges: ['Private planning artifacts'], acceptanceCriteria: ['Sourced options'], visibility: 'private-planning',
      purpose: 'proposal-development', resultDestination: 'linear-proposal', destination: { kind: 'linear', issueId: binding.issueId, teamId: binding.teamId, projectId: binding.projectId } } };
  await writeFile(moduleFile, `import { writeFile } from 'node:fs/promises';
const request = ${JSON.stringify(request)};
const issue = ${JSON.stringify(issue)};
export async function createTeamAdapters() {
 return {
  leaseDurationMs: 100000,
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
