import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 1_048_576;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function uuid(value, label) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`Invalid Linear ${label}.`);
  return value.toLowerCase();
}
function canonical(value, depth = 0) {
  if (depth > 64) throw new Error('Linear event nesting exceeds the supported limit.');
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item, depth + 1)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key], depth + 1)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// A signed service event proves transport provenance, never a human decision.
// Linear's default API actor can be the authenticating user. Keep that distinction explicit.
export function verifyLinearEvent({ rawBody, signature, secret, policy, now = Date.now() }) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > MAX_BODY_BYTES) {
    throw new Error('Linear event requires a bounded raw request body.');
  }
  if (typeof secret !== 'string' || !secret.trim()) throw new Error('Linear signing secret is required.');
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) {
    throw new Error('Invalid Linear signature.');
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new Error('Linear signature mismatch.');
  const organizationId = uuid(policy?.organizationId, 'configured organization ID');
  const webhookId = uuid(policy?.webhookId, 'configured webhook ID');
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error('Invalid Linear observation time.');
  let event;
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody)); }
  catch { throw new Error('Invalid Linear event JSON.'); }
  if (!event || Array.isArray(event) || typeof event !== 'object') throw new Error('Invalid Linear event object.');
  if (!Number.isSafeInteger(event.webhookTimestamp) || event.webhookTimestamp <= 0 ||
      Math.abs(now - event.webhookTimestamp) > 60_000) throw new Error('Linear event timestamp is stale or invalid.');
  if (uuid(event.organizationId, 'organization ID') !== organizationId ||
      uuid(event.webhookId, 'webhook ID') !== webhookId) throw new Error('Linear event does not match the configured service.');
  if (!['create', 'update', 'remove'].includes(event.action) ||
      typeof event.type !== 'string' || !event.type || event.type.length > 128 ||
      typeof event.createdAt !== 'string' || !Number.isFinite(Date.parse(event.createdAt))) {
    throw new Error('Invalid Linear data-change event.');
  }
  const entityId = uuid(event.data?.id, 'entity ID');
  const actor = event.actor === null ? null : {
    id: uuid(event.actor?.id, 'actor ID'),
    type: typeof event.actor.type === 'string' && event.actor.type.length > 0 && event.actor.type.length <= 128
      ? event.actor.type : (() => { throw new Error('Invalid Linear actor type.'); })(),
  };
  // Delivery headers are not signed. Deduplicate signed logical content rather than an
  // unsigned Linear-Delivery value or the retry-specific webhookTimestamp.
  const { webhookTimestamp: _sentAt, ...logicalEvent } = event;
  const eventId = 'sha256:' + createHash('sha256').update(canonical(logicalEvent)).digest('hex');
  let issueId = null;
  if (event.type === 'Issue') issueId = entityId;
  if (event.type === 'Comment') issueId = uuid(event.data.issueId, 'comment issue ID');
  return {
    version: 1, eventId, rawBodySha256: createHash('sha256').update(rawBody).digest('hex'),
    organizationId, webhookId, entityId, issueId, type: event.type, action: event.action,
    actor, createdAt: event.createdAt, sentAt: event.webhookTimestamp, observedAt: now,
    intent: issueId ? 'refresh-planning' : 'ignore-unsupported-event',
    authority: 'none',
  };
}
