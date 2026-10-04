#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AgentTaskStore } from './agent-task-store.mjs';
import { enqueueProposalRequest } from './agent-proposal-scope.mjs';
import { enqueuePlanningRequest } from './agent-planning-intake.mjs';
import { runTeamTicketUpdate, resumeTeamTicketAnswer } from './agent-team-conversation.mjs';
import { finishTeamArtifact, acceptTeamDelivery } from './agent-team-delivery.mjs';
import { runTeamAccounting } from './agent-team-accounting.mjs';
import { monitorTeamWorker } from './agent-team-monitor.mjs';
import { createTeamCheckpointReader } from './agent-team-checkpoint.mjs';
import { completeTeamTask } from './agent-team-completion.mjs';
import { resumeTeamWorker } from './agent-team-resume.mjs';
import { runTeamStep } from './agent-team-coordinator.mjs';

// The adapter module is locally installed trusted code, never a ticket-supplied path.
// A single explicit invocation performs one operation and never installs an automation.
const [directory, inputFile] = process.argv.slice(2);
try {
  if (!directory || !inputFile || !process.env.CODEX_THREAD_ID || !path.isAbsolute(process.env.NAVET_TEAM_ADAPTER_MODULE ?? '')) {
    throw new Error('Usage: CODEX_THREAD_ID=<owner> NAVET_TEAM_ADAPTER_MODULE=<absolute installed module> node scripts/agent-team-run.mjs <private-state-directory> <input.json>');
  }
  const input = JSON.parse(await readFile(inputFile, 'utf8'));
  if (!['proposal-intake', 'delivery-intake', 'step', 'ticket-update', 'ticket-answer', 'claim', 'plan', 'usage', 'reserve', 'artifact', 'acceptance', 'monitor', 'context', 'complete', 'resume-worker'].includes(input.operation)) throw new Error('Unsupported team operation.');
  const installed = await import(pathToFileURL(process.env.NAVET_TEAM_ADAPTER_MODULE).href);
  if (typeof installed.createTeamAdapters !== 'function') throw new Error('Installed team adapters unavailable.');
  const adapters = await installed.createTeamAdapters();
  const store = new AgentTaskStore(path.resolve(directory));
  adapters.readCheckpoint ??= createTeamCheckpointReader({ store, owner: process.env.CODEX_THREAD_ID, readWorker: adapters.readWorker });
  const options = { store, owner: process.env.CODEX_THREAD_ID, adapters, taskId: input.taskId,
    outputUpdateId: input.outputUpdateId, stageUpdateId: input.stageUpdateId, resourceToken: input.resourceToken, stageResourceToken: input.stageResourceToken, policy: adapters.ticketPolicy, kind: input.kind, body: input.body,
    stage: input.stage, questionId: input.questionId, updateId: input.updateId, answerId: input.answerId, readRequest: adapters.readRequest, readIssue: adapters.readIssue, identity: input.identity };
  let result;
  if (input.operation === 'claim') {
    const tasks = await store.list();
    const task = tasks.find((item) => item.id === input.taskId);
    const observation = task?.lease && task.lease.owner !== options.owner
      ? await adapters.readOwner(task.lease.owner) : undefined;
    result = await store.mutate(input.taskId, 'claim', { owner: options.owner, durationMs: adapters.leaseDurationMs, observation });
  } else if (input.operation === 'plan') {
    if (input.event?.type !== 'plan') throw new Error('Plan operation requires a plan event.');
    const task = (await store.list()).find((item) => item.id === input.taskId);
    const binding = task?.proposal?.binding ?? task?.planning?.binding;
    if (!binding) throw new Error('Scoped task required.');
    await store.mutate(task.id, task.proposal ? 'proposal-observation' : 'planning-observation', { owner: options.owner,
      observation: await adapters.readIssue(binding.issueId) });
    result = await store.mutate(task.id, 'team-event', { owner: options.owner, event: input.event });
  } else if (input.operation === 'context') {
    result = await store.mutate(input.taskId, 'context', { owner: options.owner, context: input.context });
  } else if (input.operation === 'usage') {
    result = await runTeamAccounting(options);
  } else if (input.operation === 'reserve') {
    result = await store.mutate(input.taskId, 'reserve-resources', { owner: options.owner,
      event: input.eventId, modelTokens: input.modelTokens, toolCalls: input.toolCalls });
  } else {
    if (input.operation === 'step') {
      const task = (await store.list()).find((item) => item.id === input.taskId);
      if (!task?.resources || !task.context?.worktree || !task.context?.branch || !task.context?.nextAction ||
          typeof adapters.interruptWorker !== 'function' || !Number.isSafeInteger(adapters.maxStopAttempts)) throw new Error('Accepted resources and recovery/stop configuration required.');
    }
    result = input.operation === 'proposal-intake' ? await enqueueProposalRequest(options)
      : input.operation === 'delivery-intake' ? await enqueuePlanningRequest(options)
      : input.operation === 'ticket-update' ? await runTeamTicketUpdate(options)
      : input.operation === 'ticket-answer' ? await resumeTeamTicketAnswer(options)
      : input.operation === 'artifact' ? await finishTeamArtifact(options)
      : input.operation === 'acceptance' ? await acceptTeamDelivery(options)
      : input.operation === 'complete' ? await completeTeamTask(options)
      : input.operation === 'resume-worker' ? await resumeTeamWorker({ ...options, intentId: input.intentId, questionId: input.questionId })
      : input.operation === 'monitor' ? await monitorTeamWorker({ ...options, intentId: input.intentId, maxStopAttempts: adapters.maxStopAttempts }) : await runTeamStep(options);
  }
  // Ticket contents and adapter errors stay private; console output only reports operation status.
  console.log(JSON.stringify({ status: result.status ?? 'queued', taskId: result.taskId ?? result.id, reason: result.reason, resourceToken: result.resourceDecision?.reservation.token, updateId: result.updateId, outputUpdateId: result.outputUpdateId, stageUpdateId: result.stageUpdateId }));
} catch {
  console.error('Team operation unavailable; inspect private configuration and retained task receipts.');
  process.exitCode = 1;
}
