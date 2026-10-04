import { isDeepStrictEqual } from 'node:util';

export const TEAM_ROLES = Object.freeze([
  'researcher', 'ux-designer', 'developer', 'tester', 'security-specialist', 'architect', 'independent-reviewer',
]);
const TERMINAL = new Set(['completed', 'failed', 'missing', 'stopped']);
function value(input, label) {
  if (typeof input !== 'string' || !input.trim() || input.length > 8192) throw new Error(`Invalid team ${label}.`);
  return input;
}
function fresh(input, now) {
  if (!Number.isFinite(input) || input <= 0 || input > now || input < now - 60_000) {
    throw new Error('Fresh team service observation is required.');
  }
}
function currentEvidence(task, worker) {
  return worker.status === 'completed' && worker.evidence?.length > 0 && worker.evidence.every((item) =>
    ((item.applicability === 'scope' || item.applicability === 'output') || item.head === task.head) &&
    item.revision === task.revision && item.result === 'pass');
}
function assignment(team, id) {
  const item = team.plan?.assignments.find((entry) => entry.id === id);
  if (!item) throw new Error('Unknown team assignment.');
  return item;
}
function workerFor(team, id) {
  const worker = team.workers.find((entry) => entry.intentId === id);
  if (!worker || worker.planRevision !== team.plan?.revision) throw new Error('Unknown current team worker intent.');
  return worker;
}
export function teamAssignmentComplete(task, assignmentId) {
  return task.team?.workers.some((worker) => worker.assignmentId === assignmentId &&
    worker.planRevision === task.team.plan?.revision && currentEvidence(task, worker)) ?? false;
}
export function teamPlanComplete(task) {
  return Boolean(task.team?.plan && task.team.plan.assignments.every((item) => teamAssignmentComplete(task, item.id)));
}

function validateCompletionEvidence(task, worker, observation, evidence, now) {
  if ((task.team?.checkpoint ?? task.workerCheckpoint) && observation.stateHash !== (task.team?.checkpoint ?? task.workerCheckpoint).stateHash) throw new Error('Team completion requires the current worktree checkpoint.');
  if (!Array.isArray(evidence) || !evidence.length) throw new Error('Completed team worker requires evidence.');
  const role = assignment(task.team, worker.assignmentId).role;
  for (const item of evidence) {
    value(item.gate, 'evidence gate'); value(item.artifact, 'evidence artifact'); fresh(item.observedAt, now);
    const applicability = item.applicability ?? 'head';
    if (!['scope', 'output', 'head'].includes(applicability) ||
        (['tester', 'independent-reviewer'].includes(role) && applicability !== 'head') ||
        (item.gate === 'independent-review' && applicability !== 'head')) throw new Error('Validation evidence must remain head-sensitive.');
    if (!['pass', 'fail'].includes(item.result) || item.head !== task.head || item.revision !== task.revision) throw new Error('Team evidence must match the current head and revision.');
  }
}

// Scope and output receipts retain their original head as historical provenance.
// Checks default to head-sensitive and become unverified whenever code changes.
export function invalidateTeamHeadEvidence(task) {
  if (!task.team) return;
  for (const worker of task.team.workers) worker.evidence = worker.evidence.map((item) =>
    ['scope', 'output'].includes(item.applicability) ? item : { ...item, result: 'unverified' });
  task.team.acceptance = null; task.team.status = 'verifying';
}

function receipt(input, now) {
  value(input.reference, 'receipt reference');
  fresh(input.observedAt, now);
}

// The owning coordinator verifies source identity, approval, scope and resource reservations.
// This reducer persists only observations and never grants execution authority.
export function applyTeamEvent(task, input, now = Date.now()) {
  value(input.eventId, 'event ID');
  const team = structuredClone(task.team ?? {
    version: 1, status: 'planning', workers: [], questions: [], events: [], updates: [],
  });
  if (team.version !== 1) throw new Error('Unsupported team state.');
  const previous = team.events.find((event) => event.eventId === input.eventId);
  if (previous) {
    if (!isDeepStrictEqual(previous.input, input)) throw new Error('Team event ID reused with changed payload.');
    return { action: 'reconcile' };
  }
  team.updates ??= [];
  let action = 'recorded';
  const view = { ...task, team };
  const waiting = team.questions.some((question) => !question.answer);
  switch (input.type) {
    case 'plan': {
      value(input.revision, 'plan revision');
      if (!['proposal', 'delivery'].includes(input.phase) || !Array.isArray(input.assignments) || !input.assignments.length) {
        throw new Error('Team plan requires a phase and assignments.');
      }
      if (team.plan?.revision === input.revision) throw new Error('Plan revision is immutable; reuse the original event ID.');
      if (waiting || team.workers.some((worker) => !TERMINAL.has(worker.status))) throw new Error('Resolve waiting or active team work before revising its plan.');
      const ids = new Set();
      for (const item of input.assignments) {
        value(item.id, 'assignment ID');
        if (ids.has(item.id) || !TEAM_ROLES.includes(item.role) || !Array.isArray(item.dependsOn) || !Array.isArray(item.files) ||
            !item.brief || typeof item.brief !== 'object' || Array.isArray(item.brief)) throw new Error('Invalid team assignment.');
        if (input.phase === 'proposal' && ['developer', 'independent-reviewer'].includes(item.role)) throw new Error('Proposal assignments cannot implement production work.');
        if (item.role === 'independent-reviewer' && item.files.length) throw new Error('Independent review has read-only file scope.');
        ids.add(item.id);
        item.files.forEach((file) => {
          value(file, 'file ownership');
          if (file.startsWith('/') || file.split('/').includes('..')) throw new Error('Team file ownership must be repository relative.');
        });
      }
      const seen = new Set();
      const pending = new Set();
      const visit = (id) => {
        if (pending.has(id)) throw new Error('Team dependency cycle.');
        if (seen.has(id)) return;
        pending.add(id);
        const item = input.assignments.find((entry) => entry.id === id);
        for (const dependency of item.dependsOn) {
          if (!ids.has(dependency) || dependency === id) throw new Error('Unknown team dependency.');
          visit(dependency);
        }
        pending.delete(id); seen.add(id);
      };
      ids.forEach(visit);
      // Concurrent writers need disjoint ownership. Ordered assignments may hand files over.
      const precedes = (before, after) => after.dependsOn.some((id) => id === before.id || precedes(before, input.assignments.find((item) => item.id === id)));
      for (const left of input.assignments) for (const right of input.assignments) {
        if (left.id !== right.id && left.files.some((file) => right.files.includes(file)) &&
            !precedes(left, right) && !precedes(right, left)) throw new Error('Parallel team assignments overlap file ownership.');
      }
      if (input.phase === 'delivery' && !input.assignments.some((item) => item.role === 'independent-reviewer')) {
        throw new Error('Delivery plan requires independent review.');
      }
      if (input.phase === 'delivery') {
        for (const reviewer of input.assignments.filter((item) => item.role === 'independent-reviewer')) {
          if (!input.assignments.filter((item) => ['developer', 'tester'].includes(item.role) || (item.files.length && item.role !== 'independent-reviewer'))
            .every((builder) => precedes(builder, reviewer))) {
            throw new Error('Independent review must depend on every developer and tester assignment.');
          }
        }
      }
      if (input.phase === 'proposal' && !input.assignments.some((item) => item.role === 'researcher')) {
        throw new Error('Proposal plan requires research evidence.');
      }
      team.plan = { revision: input.revision, phase: input.phase, assignments: structuredClone(input.assignments) };
      team.status = input.phase === 'proposal' ? 'developing-proposal' : 'implementing';
      team.acceptance = null;
      break;
    }
    case 'worker-intent': {
      if (waiting) throw new Error('Team is awaiting ticket input.');
      const item = assignment(team, input.assignmentId);
      value(input.intentId, 'worker intent ID');
      if (team.workers.some((worker) => worker.intentId === input.intentId)) throw new Error('Worker intent ID already exists.');
      if (!item.dependsOn.every((id) => teamAssignmentComplete(view, id))) throw new Error('Team dependencies require current-head passing evidence.');
      const prior = team.workers.filter((worker) => worker.assignmentId === item.id && worker.planRevision === team.plan.revision);
      if (prior.length) throw new Error('Reconcile existing team worker before creating another.');
      team.workers.push({ intentId: input.intentId, assignmentId: item.id, role: item.role, planRevision: team.plan.revision,
        head: task.head, revision: task.revision, status: 'reserved', createdAt: now, evidence: [] });
      break;
    }
    case 'worker-attempt': {
      if (waiting) throw new Error('Team is awaiting ticket input.');
      const worker = workerFor(team, input.intentId);
      const item = assignment(team, worker.assignmentId);
      if (!item.dependsOn.every((id) => teamAssignmentComplete(view, id))) throw new Error('Team dependencies require current-head passing evidence.');
      if (worker.status !== 'reserved') throw new Error('Uncertain worker creation requires lookup before sending again.');
      worker.status = 'uncertain'; worker.attemptedAt = now; action = 'send';
      break;
    }
    case 'worker-bind': {
      const worker = workerFor(team, input.intentId);
      value(input.workerId, 'worker ID');
      if (worker.workerId && worker.workerId !== input.workerId) throw new Error('Worker binding is immutable.');
      if (!['uncertain', 'running'].includes(worker.status)) throw new Error('Worker must have a durable creation attempt.');
      const same = team.workers.filter((entry) => entry.intentId !== worker.intentId && entry.workerId === input.workerId);
      if (same.length) throw new Error('Each assignment requires a distinct worker, including independent review.');
      worker.workerId = input.workerId; worker.status = 'running';
      break;
    }
    case 'worker-observation': {
      const worker = workerFor(team, input.intentId);
      const observation = input.observation;
      receipt(observation, now);
      if (!['running', 'completed', 'failed', 'missing', 'stopped'].includes(observation.status) || worker.status === 'reserved') throw new Error('Invalid team worker observation.');
      if (worker.observation && observation.observedAt < worker.observation.observedAt) throw new Error('Team worker observation regressed.');
      if (TERMINAL.has(worker.status)) throw new Error('Terminal team worker observation is immutable.');
      if (observation.status !== 'missing' && (!worker.workerId || observation.workerId !== worker.workerId)) throw new Error('Observation must match the bound worker.');
      if (observation.status === 'stopped') {
        if (!observation.checkpoint || !observation.checkpoint.reference || !observation.checkpoint.nextAction || observation.checkpoint.head !== task.head) throw new Error('Stopped specialist requires a current recovery checkpoint.');
        worker.checkpoint = structuredClone(observation.checkpoint);
      }
      if (observation.status === 'completed') {
        validateCompletionEvidence(view, worker, observation, input.evidence, now);
        worker.evidence = structuredClone(input.evidence);
      }
      worker.status = observation.status; worker.observation = structuredClone(observation);
      break;
    }
    case 'worker-resume-intent': {
      const worker = workerFor(team, input.intentId);
      const question = team.questions.find((item) => item.questionId === input.questionId);
      receipt(input.worker, now); value(input.resumeId, 'resume ID');
      if (waiting || !question?.answer || question.answer.reference !== input.answerReference ||
          worker.status !== 'stopped' || worker.stop?.reason !== 'awaiting-input' || worker.stop?.status !== 'stopped' ||
          !worker.stop.questionIds?.includes(input.questionId) || question.answer.observedAt < worker.stop.intentAt || !worker.checkpoint || input.worker.workerId !== worker.workerId ||
          input.worker.status !== 'stopped' || !input.worker.runId || !input.worker.checkpoint ||
          input.worker.checkpoint.reference !== worker.checkpoint.reference || input.worker.checkpoint.head !== task.head) throw new Error('Accepted answer and exact stopped recovery checkpoint required.');
      worker.resumes ??= [];
      const prior = worker.resumes.find((item) => item.resumeId === input.resumeId);
      if (prior) throw new Error('Existing resume intent requires reconciliation.');
      worker.resumes.push({ resumeId: input.resumeId, questionId: input.questionId, answerReference: input.answerReference,
        previousRunId: input.worker.runId, checkpoint: structuredClone(worker.checkpoint), createdAt: now, status: 'reserved' });
      break;
    }
    case 'worker-resume-attempt': {
      const worker = workerFor(team, input.intentId);
      const resume = worker.resumes?.find((item) => item.resumeId === input.resumeId);
      if (waiting || !resume || worker.status !== 'stopped') throw new Error('Exact stopped resume intent required.');
      if (resume.status !== 'reserved') { action = 'reconcile'; break; }
      resume.status = 'uncertain'; resume.attemptedAt = now; action = 'send';
      break;
    }
    case 'worker-resume-bind': {
      const worker = workerFor(team, input.intentId);
      const resume = worker.resumes?.find((item) => item.resumeId === input.resumeId);
      const observed = input.observation; receipt(observed, now);
      if (!resume?.attemptedAt || observed.taskId !== task.id || observed.intentId !== worker.intentId ||
          observed.workerId !== worker.workerId || observed.resumeId !== resume.resumeId || !observed.runId ||
          observed.runId === resume.previousRunId || !['running', 'completed', 'stopped', 'failed'].includes(observed.status)) throw new Error('Exact existing-worker resume observation required.');
      if (resume.newRunId && resume.newRunId !== observed.runId) throw new Error('Resume run binding is immutable.');
      resume.status = 'running'; resume.newRunId = observed.runId; resume.runId = observed.runId;
      resume.previousStop = structuredClone(worker.stop ?? null);
      worker.stop = null; worker.status = 'running'; worker.observation = structuredClone(observed); worker.evidence = [];
      break;
    }
    case 'worker-stop-intent': {
      const worker = workerFor(team, input.intentId);
      receipt(input.worker, now);
      if (input.worker.workerId !== worker.workerId || input.worker.status !== 'running' || !input.worker.runId ||
          !['request-withdrawn', 'request-unverified', 'scope-unverified', 'resource-exhausted', 'usage-unverified', 'awaiting-input'].includes(input.reason) ||
          !Number.isSafeInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 10) throw new Error('Exact running worker and accepted stop policy required.');
      if (worker.stop) {
        if (worker.stop.runId !== input.worker.runId || worker.stop.maxAttempts !== input.maxAttempts) throw new Error('Worker stop identity and policy are immutable.');
      } else worker.stop = { token: input.stopToken, runId: input.worker.runId, reason: input.reason,
        maxAttempts: input.maxAttempts, attempts: 0, status: 'pending', intentAt: now,
        questionIds: team.questions.filter((question) => !question.answer).map((question) => question.questionId) };
      value(worker.stop.token, 'stop token');
      break;
    }
    case 'worker-stop-attempt': {
      const worker = workerFor(team, input.intentId);
      receipt(input.worker, now);
      if (!worker.stop || input.stopToken !== worker.stop.token || input.worker.runId !== worker.stop.runId ||
          input.worker.workerId !== worker.workerId || input.worker.status !== 'running') throw new Error('Fresh bound stop incarnation required.');
      if (worker.stop.status === 'stopped' || worker.stop.attempts >= worker.stop.maxAttempts) { action = 'reconcile'; break; }
      worker.stop.attempts++; worker.stop.attemptedAt = now; action = 'send';
      break;
    }
    case 'worker-stop-observation': {
      const worker = workerFor(team, input.intentId);
      const observed = input.worker;
      receipt(observed, now);
      if (!worker.stop || observed.workerId !== worker.workerId || observed.runId !== worker.stop.runId ||
          !['running', 'stopped', 'completed'].includes(observed.status)) throw new Error('Exact worker stop observation required.');
      if (worker.stop.observation && observed.observedAt < worker.stop.observation.observedAt) throw new Error('Worker stop observation regressed.');
      worker.stop.observation = structuredClone(observed);
      if (['stopped', 'completed'].includes(observed.status)) {
        if (!observed.checkpoint || !observed.checkpoint.reference || !observed.checkpoint.nextAction ||
            observed.checkpoint.head !== task.head) throw new Error('Stopped worker requires durable current recovery checkpoint.');
        worker.stop.status = 'stopped'; worker.status = observed.status; worker.observation = structuredClone(observed);
        if (observed.status === 'completed') {
          validateCompletionEvidence(view, worker, observed, observed.evidence, now);
          worker.evidence = structuredClone(observed.evidence);
        }
        worker.checkpoint = structuredClone(observed.checkpoint);
      }
      break;
    }
    case 'ticket-intent': {
      const item = input.receipt;
      value(item?.updateId, 'ticket update ID'); value(item?.bodyHash, 'ticket body hash');
      if (item.status !== 'pending' || item.attemptedAt != null) throw new Error('Ticket intent must precede its attempt.');
      const prior = team.updates.find((entry) => entry.updateId === item.updateId);
      if (prior && !isDeepStrictEqual(prior.receipt, item)) throw new Error('Ticket update ID reused with changed payload.');
      if (!prior) team.updates.push({ updateId: item.updateId, receipt: structuredClone(item), status: 'pending' });
      break;
    }
    case 'ticket-attempt': {
      const update = team.updates.find((entry) => entry.updateId === input.updateId);
      if (!update) throw new Error('Unknown ticket update intent.');
      if (update.status !== 'pending' || update.receipt.attemptedAt != null) { action = 'reconcile'; break; }
      update.receipt.attemptedAt = now; update.status = 'uncertain'; action = 'send';
      break;
    }
    case 'ticket-observation': {
      const update = team.updates.find((entry) => entry.updateId === input.updateId);
      if (!update || !update.receipt.attemptedAt) throw new Error('Unknown attempted ticket update.');
      const observation = input.observation;
      fresh(observation?.observedAt, now);
      if (observation.updateId !== update.updateId || !['verified', 'uncertain', 'blocked'].includes(observation.status)) {
        throw new Error('Ticket observation must match the update.');
      }
      if ((update.status === 'verified' && observation.status !== 'verified') || (update.observation && observation.observedAt < update.observation.observedAt)) {
        throw new Error('Ticket observation cannot regress.');
      }
      update.status = observation.status; update.observation = structuredClone(observation);
      break;
    }
    case 'question': {
      receipt(input, now); value(input.questionId, 'question ID'); value(input.text, 'question text');
      if (team.questions.some((question) => question.questionId === input.questionId)) throw new Error('Question identity is immutable.');
      team.questions.push({ questionId: input.questionId, text: input.text, reference: input.reference,
        observedAt: input.observedAt, planningRevision: (task.proposal?.binding ?? task.planning?.binding)?.revision,
        resumeStatus: waiting ? team.questions.findLast((entry) => !entry.answer).resumeStatus : team.status });
      team.status = 'awaiting-input';
      break;
    }
    case 'answer': {
      const question = team.questions.find((entry) => entry.questionId === input.questionId);
      if (!question || question.answer) throw new Error('Unknown or already answered ticket question.');
      const answer = input.answer;
      receipt(answer, now); value(answer.actor, 'answer actor'); value(answer.text, 'answer text');
      if (answer.verified !== true || answer.actor !== task.authority?.actor || answer.observedAt < question.observedAt ||
          answer.planningRevision !== (task.proposal?.binding ?? task.planning?.binding)?.revision || question.planningRevision !== answer.planningRevision) {
        throw new Error('Verified answer must preserve the current planning scope.');
      }
      question.answer = structuredClone(answer);
      if (team.questions.every((entry) => entry.answer)) team.status = question.resumeStatus;
      break;
    }
    case 'proposal': {
      receipt(input, now);
      if (waiting || team.plan?.phase !== 'proposal' || !teamPlanComplete(view)) throw new Error('Proposal requires all assigned current evidence.');
      team.proposal = { reference: input.reference, observedAt: input.observedAt, planRevision: team.plan.revision, head: task.head, revision: task.revision, manifest: structuredClone(input.manifest ?? null), bodyHash: input.bodyHash ?? null };
      team.status = 'awaiting-prioritization';
      break;
    }
    case 'pr': {
      receipt(input, now); value(input.url, 'PR URL'); value(input.preview, 'preview');
      if (waiting || team.plan?.phase !== 'delivery' || !teamPlanComplete(view) || input.head !== task.head || input.revision !== task.revision) {
        throw new Error('PR output requires complete current-head team evidence.');
      }
      const reviewer = team.plan.assignments.find((item) => item.role === 'independent-reviewer');
      if (!team.workers.some((worker) => worker.assignmentId === reviewer.id && worker.planRevision === team.plan.revision &&
          currentEvidence(view, worker) && worker.evidence.some((item) => item.gate === 'independent-review'))) {
        throw new Error('PR output requires explicit independent review evidence.');
      }
      if (team.pr && team.pr.url !== input.url) throw new Error('Team delivery must retain one PR.');
      team.pr = { url: input.url, preview: input.preview, head: input.head, revision: input.revision, reference: input.reference, observedAt: input.observedAt };
      team.acceptance = null; team.status = 'awaiting-review';
      break;
    }
    case 'acceptance': {
      receipt(input, now);
      if (waiting || !team.pr || !teamPlanComplete(view) || input.verified !== true || input.result !== 'accepted' ||
          input.head !== task.head || input.revision !== task.revision || team.pr.head !== input.head || team.pr.revision !== input.revision) {
        throw new Error('Acceptance requires verified current-head review.');
      }
      team.acceptance = structuredClone(input); team.status = 'acceptance-recorded';
      break;
    }
    case 'finish': {
      if (waiting || !teamPlanComplete(view)) throw new Error('Team completion requires all current accepted evidence.');
      const output = team.updates.find((item) => item.updateId === input.outputUpdateId);
      const stage = team.updates.find((item) => item.updateId === input.stageUpdateId);
      const current = (update) => update?.status === 'verified' && update.receipt.taskRevision === task.revision &&
        update.receipt.planRevision === team.plan.revision && update.receipt.deliveryHead === task.head &&
        update.receipt.scopeRevision === (task.proposal?.binding ?? task.planning?.binding)?.revision;
      if (!current(output) || !current(stage) || stage.receipt.kind !== 'stage' ||
          (team.plan.phase === 'proposal' ? output.receipt.kind !== 'proposal' || stage.receipt.stage !== 'Ready for prioritization' || !team.proposal
            : output.receipt.kind !== 'pr-evidence' || stage.receipt.stage !== 'Validated' || !team.acceptance ||
              team.acceptance.head !== task.head || team.acceptance.revision !== task.revision)) throw new Error('Exact output and accepted stage readback required.');
      team.completion = { outputUpdateId: input.outputUpdateId, stageUpdateId: input.stageUpdateId, completedAt: now };
      team.status = team.plan.phase === 'proposal' ? 'proposal-complete' : 'accepted';
      break;
    }
    default: throw new Error('Unknown team event type.');
  }
  team.events.push({ eventId: input.eventId, input: structuredClone(input), recordedAt: now });
  task.team = team;
  return { action };
}
