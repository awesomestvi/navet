import { createHash } from 'node:crypto';

const STAGES = new Set(['Captured', 'Developing proposal', 'Ready for prioritization', 'Approved',
  'In delivery', 'Validated', 'Needs evidence', 'Deferred', 'Rejected', 'Superseded']);
const ACTIVE_STAGES = new Set(['Approved', 'In delivery']);
const BINDING_KEYS = ['issueId', 'teamId', 'projectId', 'revision'];

function text(value, label, max = 4096) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`Invalid planning ${label}.`);
  }
  return value;
}

export function validatePlanningBinding(binding) {
  if (!binding || Object.keys(binding).length !== BINDING_KEYS.length) {
    throw new Error('Planning binding requires issue, team, project and revision.');
  }
  for (const key of BINDING_KEYS) text(binding[key], key);
  if (!/^sha256:[a-f0-9]{64}$/.test(binding.revision)) throw new Error('Invalid planning revision.');
  return binding;
}

// Linear reissues temporary access signatures for the same private storage object.
// Retain the file address and every other query/fragment; this does not verify file access.
export function planningAttachmentReference(value) {
  const reference = text(value, 'attachment URL');
  let url;
  try { url = new URL(reference); } catch { return reference; }
  if (url.origin !== 'https://uploads.linear.app' || url.username || url.password ||
      !url.searchParams.has('signature')) return reference;
  url.searchParams.delete('signature');
  return url.href;
}

// Linear also returns storage URLs inside Markdown images, links and reference definitions.
// Keep delimiters and all prose intact; canonicalize only complete URLs at content boundaries.
function planningDescription(value) {
  return value.replace(/(^|[\s(<>"'`])https:\/\/uploads\.linear\.app\/[^\s<>"'`()\[\]{}]+/g,
    (match, boundary) => {
      const url = match.slice(boundary.length);
      const punctuation = url.match(/[.,;!]+$/)?.[0] ?? '';
      return boundary + planningAttachmentReference(url.slice(0, url.length - punctuation.length)) + punctuation;
    });
}

// Scope includes the full proposal and attachment references, never its mutable priority/stage.
// A fingerprint verifies identity/content; it does not prove authorship, artifact access or approval.
export function createPlanningBinding(issue) {
  const identity = { issueId: text(issue?.uuid ?? issue?.id, 'issue ID'),
    teamId: text(issue?.teamId, 'team ID'), projectId: text(issue?.projectId, 'project ID') };
  const title = text(issue?.title, 'title');
  const description = planningDescription(text(issue?.description, 'description', 1_048_576));
  if (!Array.isArray(issue.attachments)) throw new Error('Planning attachments must be a complete array.');
  const attachments = issue.attachments.map((item) => ({ id: text(item?.id, 'attachment ID'),
    url: planningAttachmentReference(item?.url) })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (new Set(attachments.map((item) => item.id)).size !== attachments.length) {
    throw new Error('Duplicate planning attachment identity.');
  }
  const revision = 'sha256:' + createHash('sha256')
    .update(JSON.stringify({ ...identity, title, description, attachments })).digest('hex');
  return { ...identity, revision };
}

export function evaluatePlanningObservation(binding, observation, now = Date.now()) {
  validatePlanningBinding(binding);
  if (!Number.isFinite(now) || now <= 0 || !Number.isFinite(observation?.observedAt) ||
      observation.observedAt <= 0 || observation.observedAt < now - 60_000 || observation.observedAt > now) {
    throw new Error('A fresh planning-service observation is required.');
  }
  const reference = text(observation.reference, 'service reference');
  const result = (value, reason, extra = {}) => ({ result: value, reason, reference,
    observedAt: observation.observedAt, ...extra });
  if (observation.status === 'unavailable') return result('unverified', 'planning-access-unverified');
  if (observation.status === 'missing') {
    if (observation.issueId !== binding.issueId) throw new Error('Missing planning issue identity mismatch.');
    return result('fail', 'planning-proposal-withdrawn');
  }
  if (observation.status !== 'available') throw new Error('Invalid planning observation status.');
  const issue = observation.issue;
  if (['archivedAt', 'canceledAt'].some((key) => !Object.hasOwn(issue ?? {}, key) ||
      (issue[key] !== null && (typeof issue[key] !== 'string' || !Number.isFinite(Date.parse(issue[key])))))) {
    throw new Error('Planning lifecycle fields must be explicit nulls or valid timestamps.');
  }
  const current = createPlanningBinding(issue);
  if (BINDING_KEYS.some((key) => current[key] !== binding[key])) {
    return result('fail', 'planning-scope-changed', { revision: current.revision });
  }
  if (issue.archivedAt || issue.canceledAt) return result('fail', 'planning-proposal-withdrawn');
  if (!Array.isArray(issue.labels) || issue.labels.some((label) => typeof label !== 'string')) {
    throw new Error('Planning stage requires complete label names.');
  }
  const stages = issue.labels.filter((label) => STAGES.has(label));
  if (stages.length !== 1) return result('unverified', 'planning-stage-ambiguous');
  const stage = stages[0];
  return result(ACTIVE_STAGES.has(stage) ? 'pass' : 'fail',
    ACTIVE_STAGES.has(stage) ? 'planning-scope-current' : 'planning-proposal-withdrawn',
    { revision: current.revision, stage });
}

export function planningStatus(task, now = Date.now()) {
  if (!task.planning) return { bound: false };
  validatePlanningBinding(task.planning.binding);
  if (task.planning.revokedAt) {
    return { bound: true, result: 'fail', reason: 'planning-request-revoked' };
  }
  const observation = task.planning.observation;
  if (!observation || !Number.isFinite(observation.observedAt) || observation.observedAt <= 0 ||
      observation.observedAt > now || observation.observedAt < now - 60_000) {
    return { bound: true, result: 'unverified', reason: 'planning-observation-stale' };
  }
  return { bound: true, ...observation };
}

export function requirePlanningScope(task, now) {
  if (task.requestRevocation) throw new Error('Request authority blocks execution: request-authority-revoked.');
  if (task.workerStop && task.workerStop.status !== 'stopped') {
    throw new Error('Worker stop blocks execution: worker-stop-unverified.');
  }
  const status = planningStatus(task, now);
  if (status.bound && status.result !== 'pass') throw new Error(`Planning scope blocks execution: ${status.reason}.`);
  if (status.bound && task.brief?.visibility !== 'public-delivery-approved') {
    throw new Error('The shared delivery queue requires explicit public visibility approval for planning-bound execution.');
  }
}
