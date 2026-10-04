import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { linearResultBodyHash } from './agent-linear-result-reader.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const KINDS = ['proposal', 'question', 'answer', 'pr-evidence', 'stage'];
const STAGES = ['Developing proposal', 'Ready for prioritization', 'In delivery', 'Validated'];
const boundedString = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 4096;
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Persist this intent before invoking the adapter. Its identity excludes the clock so replaying
// the same update preserves ownership; a changed body or scope creates a distinct update.
export function createTeamTicketUpdate({ taskId, issueId, scopeRevision, kind, body, stage = null,
  questionId = null, taskRevision = null, planRevision = null, deliveryHead = null, intentAt, writerAppUserId } = {}) {
  if (!boundedString(taskId) || !UUID.test(issueId) || !boundedString(scopeRevision) ||
      !KINDS.includes(kind) || !UUID.test(writerAppUserId) || !Number.isSafeInteger(intentAt) || intentAt <= 0 ||
      [taskRevision, planRevision, deliveryHead].some((item) => item !== null && !boundedString(item)) ||
      (kind === 'stage' ? !STAGES.includes(stage) : stage !== null) ||
      (['question', 'answer'].includes(kind) ? !boundedString(questionId) : questionId !== null)) {
    throw new Error('Ticket update requires an exact task, scope, destination and supported operation.');
  }
  const content = { taskId, issueId, scopeRevision, kind, bodyHash: linearResultBodyHash(body),
    stage, questionId, taskRevision, planRevision, deliveryHead, writerAppUserId };
  const hash = digest(content);
  const updateId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  return { ...content, updateId, intentAt, attemptedAt: null, status: 'pending' };
}

export function teamTicketReadbackMatches(policy, observation, receipt, startedAt, now) {
  return observation?.status === 'available' && Number.isSafeInteger(observation.observedAt) &&
    observation.observedAt >= startedAt && observation.observedAt <= now &&
    observation.organizationId === policy.organizationId && observation.readerAppUserId === policy.readerAppUserId &&
    observation.readerIsApp === true && observation.issueId === receipt.issueId && observation.teamId === policy.teamId &&
    observation.projectId === policy.projectId && observation.private === true && observation.active === true && observation.synced === false &&
    observation.updateId === receipt.updateId && observation.writerAppUserId === policy.writerAppUserId &&
    observation.writerIsApp === true && observation.onBehalfOf === null &&
    observation.bodyHash === receipt.bodyHash && observation.kind === receipt.kind &&
    observation.stage === receipt.stage && observation.questionId === receipt.questionId &&
    observation.taskId === receipt.taskId && observation.scopeRevision === receipt.scopeRevision &&
    observation.taskRevision === receipt.taskRevision && observation.planRevision === receipt.planRevision && observation.deliveryHead === receipt.deliveryHead &&
    typeof observation.url === 'string' && /^https:\/\/linear\.app\/[^\s]+$/.test(observation.url);
}

// Installation code owns these authenticated callbacks. Ticket content and agent output must
// never supply callbacks or identity policy. No callback acknowledgement establishes readback,
// human authority, implementation approval or acceptance of a PR.
export function createTeamTicketAdapter({ policy, readDestination, readAuthority, beginAttempt,
  writeUpdate, readUpdate, readAnswer, now = () => Date.now(), maxOperationMs = 20_000, signal: cancellationSignal } = {}) {
  if (!policy || ['organizationId', 'teamId', 'projectId', 'readerAppUserId', 'writerAppUserId']
    .some((key) => !UUID.test(policy[key])) || policy.readerAppUserId === policy.writerAppUserId ||
    !Array.isArray(policy.humanActorIds) || !policy.humanActorIds.length ||
    policy.humanActorIds.some((id) => !UUID.test(id) || [policy.readerAppUserId, policy.writerAppUserId].includes(id)) ||
    [readDestination, readAuthority, beginAttempt, writeUpdate, readUpdate, readAnswer, now]
      .some((fn) => typeof fn !== 'function') || !Number.isSafeInteger(maxOperationMs) ||
    maxOperationMs < 1 || maxOperationMs > 60_000) {
    throw new Error('Ticket adapter requires installed scoped readers, writer and human identity policy.');
  }
  policy = structuredClone(policy);
  const active = new Set();
  const attempted = new Set();
  const fresh = (observation, startedAt) => observation?.status === 'available' &&
    Number.isSafeInteger(observation.observedAt) && observation.observedAt >= startedAt && observation.observedAt <= now();
  const destinationMatches = (observation, receipt, startedAt) => fresh(observation, startedAt) &&
    observation.organizationId === policy.organizationId && observation.readerAppUserId === policy.readerAppUserId &&
    observation.readerIsApp === true && observation.issueId === receipt.issueId &&
    observation.teamId === policy.teamId && observation.projectId === policy.projectId &&
    observation.private === true && observation.active === true && observation.synced === false;
  const authorityMatches = (observation, receipt, startedAt) => fresh(observation, startedAt) &&
    observation.taskId === receipt.taskId && observation.issueId === receipt.issueId &&
    observation.scopeRevision === receipt.scopeRevision && observation.active === true &&
    ['discovery', 'implementation'].includes(observation.kind) && observation.actorIsApp === false &&
    policy.humanActorIds.includes(observation.actorId) && boundedString(observation.reference) &&
    Number.isSafeInteger(observation.expiresAt) && observation.expiresAt > now() &&
    (!(['pr-evidence', 'answer'].includes(receipt.kind) || ['In delivery', 'Validated'].includes(receipt.stage)) || observation.kind === 'implementation');
  const readbackMatches = (observation, receipt, startedAt) => teamTicketReadbackMatches(policy, observation, receipt, startedAt, now());
  const bounded = async (operation) => {
    const controller = new AbortController();
    let timer;
    const cancel = () => controller.abort();
    cancellationSignal?.addEventListener('abort', cancel, { once: true });
    try {
      if (cancellationSignal?.aborted) throw new Error('Ticket operation canceled.');
      return await Promise.race([operation(controller.signal), new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Ticket operation canceled.')), { once: true });
        timer = setTimeout(() => { controller.abort(); reject(new Error('Ticket deadline exceeded.')); }, maxOperationMs);
      })]);
    } finally { clearTimeout(timer); cancellationSignal?.removeEventListener('abort', cancel); controller.abort(); }
  };
  const validate = (receipt, body) => {
    const expected = createTeamTicketUpdate({ ...receipt, body });
    return isDeepStrictEqual({ ...receipt, attemptedAt: null, status: 'pending' }, expected) &&
      receipt.writerAppUserId === policy.writerAppUserId && receipt.intentAt <= now() &&
      ['pending', 'unverified', 'uncertain', 'blocked', 'verified'].includes(receipt.status) &&
      (receipt.attemptedAt === null || (Number.isSafeInteger(receipt.attemptedAt) &&
        receipt.attemptedAt >= receipt.intentAt && receipt.attemptedAt <= now()));
  };
  return {
    async deliver({ receipt, body } = {}) {
      receipt = structuredClone(receipt);
      let reserved = false;
      let key;
      let claimed = false;
      try {
        if (!validate(receipt, body)) throw new Error('Invalid intent.');
        key = receipt.updateId;
        if (active.has(key)) return { status: 'blocked', reason: 'ticket-update-busy' };
        active.add(key);
        claimed = true;
        return await bounded(async (signal) => {
          let startedAt = now();
          let observed = await readUpdate(receipt, { signal });
          if (readbackMatches(observed, receipt, startedAt)) return { status: 'verified', receipt, observation: observed };
          // Even a confirmed absence after an attempt does not authorize a second send.
          if (receipt.attemptedAt !== null || attempted.has(key) || receipt.status !== 'pending') {
            return { status: 'uncertain', reason: 'ticket-update-requires-reconciliation' };
          }
          if (observed?.status !== 'absent' || !Number.isSafeInteger(observed.observedAt) ||
              observed.observedAt < startedAt || observed.observedAt > now()) throw new Error('Read unavailable.');
          startedAt = now();
          if (!destinationMatches(await readDestination(receipt.issueId, { signal }), receipt, startedAt)) throw new Error('Destination unavailable.');
          startedAt = now();
          const authority = await readAuthority(receipt, { signal });
          if (!authorityMatches(authority, receipt, startedAt)) throw new Error('Scope unavailable.');
          reserved = true;
          attempted.add(key);
          const permit = await beginAttempt({ receipt, authority }, { signal });
          if (signal.aborted || permit?.action !== 'send' || !Number.isSafeInteger(permit.receipt?.attemptedAt) ||
              permit.receipt.attemptedAt < authority.observedAt || permit.receipt.attemptedAt > now() ||
              !isDeepStrictEqual(permit.receipt, { ...receipt, attemptedAt: permit.receipt.attemptedAt })) throw new Error('Reservation unavailable.');
          receipt = permit.receipt;
          startedAt = now();
          if (!authorityMatches(await readAuthority(receipt, { signal }), receipt, startedAt)) throw new Error('Authority changed.');
          startedAt = now();
          if (!destinationMatches(await readDestination(receipt.issueId, { signal }), receipt, startedAt) || signal.aborted) throw new Error('Destination changed.');
          await writeUpdate({ receipt, body }, { signal });
          startedAt = now();
          observed = await readUpdate(receipt, { signal });
          if (!readbackMatches(observed, receipt, startedAt)) throw new Error('Readback unverified.');
          return { status: 'verified', receipt, observation: observed };
        });
      } catch {
        return { status: reserved ? 'uncertain' : 'blocked', reason: reserved ? 'ticket-update-requires-reconciliation' : 'ticket-update-unverified' };
      } finally { if (claimed) active.delete(key); }
    },
    async acceptAnswer({ receipt, answerId } = {}) {
      try {
        receipt = structuredClone(receipt);
        if (receipt?.kind !== 'question' || receipt.status !== 'verified' || !UUID.test(answerId) ||
            !UUID.test(receipt.updateId) || !UUID.test(receipt.issueId) ||
            receipt.writerAppUserId !== policy.writerAppUserId || !boundedString(receipt.taskId) ||
            !boundedString(receipt.scopeRevision) || !boundedString(receipt.questionId) ||
            !Number.isSafeInteger(receipt.intentAt) || receipt.intentAt <= 0 ||
            !Number.isSafeInteger(receipt.attemptedAt) || receipt.attemptedAt < receipt.intentAt ||
            receipt.attemptedAt > now()) throw new Error('Question unverified.');
        return await bounded(async (signal) => {
          let startedAt = now();
          if (!readbackMatches(await readUpdate(receipt, { signal }), receipt, startedAt)) throw new Error('Question changed.');
          startedAt = now();
          if (!authorityMatches(await readAuthority(receipt, { signal }), receipt, startedAt)) throw new Error('Authority changed.');
          startedAt = now();
          const answer = await readAnswer({ receipt, answerId }, { signal });
          if (!destinationMatches(answer, receipt, startedAt) || answer.answerId !== answerId ||
              answer.questionId !== receipt.questionId || answer.questionUpdateId !== receipt.updateId ||
              answer.taskId !== receipt.taskId || answer.scopeRevision !== receipt.scopeRevision ||
              answer.actorIsApp !== false || !policy.humanActorIds.includes(answer.actorId) ||
              answer.onBehalfOf !== null || answer.scopeChanged !== false || !boundedString(answer.reference) ||
              !Number.isSafeInteger(answer.createdAt) || answer.createdAt <= receipt.attemptedAt ||
              answer.createdAt > answer.observedAt || !boundedString(answer.text) ||
              answer.bodyHash !== linearResultBodyHash(answer.text)) {
            throw new Error('Answer does not match the accepted question and scope.');
          }
          startedAt = now();
          if (!authorityMatches(await readAuthority(receipt, { signal }), receipt, startedAt) || signal.aborted) throw new Error('Authority changed during answer read.');
          return { status: 'accepted', answer };
        });
      } catch { return { status: 'blocked', reason: 'ticket-answer-unverified' }; }
    },
  };
}
