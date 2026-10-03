import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyLinearEvent } from './agent-linear-event.mjs';

const now = 1_700_000_000_000;
const secret = 'synthetic-signing-secret';
const policy = { organizationId: 'dc844923-f9a4-40a3-825c-dea7747e57d6', webhookId: '000042e3-d123-4980-b49f-8e140eef9329' };
// Shape follows Linear's documented Comment data-change payload; all contents are synthetic.
const fixture = () => ({ action: 'create', type: 'Comment',
  actor: { id: 'b5ea5f1f-8adc-4f52-b4bd-ab4e84cf51ba', type: 'user', name: 'Example', email: 'private@example.test' },
  data: { id: '2174add1-f7c8-44e3-bbf3-2d60b5ea8bc9', body: 'Approve this private proposal', issueId: '539068e2-ae88-4d09-bd75-22eb4a59612f' },
  url: 'https://linear.app/private/issue/NAV-42', createdAt: '2023-11-14T22:13:00.000Z',
  ...policy, webhookTimestamp: now });
const sign = (rawBody) => createHmac('sha256', secret).update(rawBody).digest('hex');
function read(event = fixture(), options = {}) {
  const rawBody = Buffer.from(JSON.stringify(event));
  return verifyLinearEvent({ rawBody, signature: sign(rawBody), secret, policy, now, ...options });
}

describe('Linear service-event provenance', () => {
  it('normalizes a signed comment into a refresh intent without approval or private contents', () => {
    const receipt = read();
    expect(receipt).toMatchObject({ intent: 'refresh-planning', authority: 'none', issueId: fixture().data.issueId, actor: { type: 'user' } });
    expect(receipt.eventId).toMatch(/^sha256:[a-f0-9]{64}$/);
    for (const privateValue of ['Approve this', 'private@example.test', 'https://linear.app/private']) {
      expect(JSON.stringify(receipt)).not.toContain(privateValue);
    }
  });
  it('does not grant authority to an Approved issue update or an account-attributed API event', () => {
    expect(read({ ...fixture(), type: 'Issue', action: 'update', data: { id: fixture().data.issueId, labels: ['Approved'] }, updatedFrom: { labels: ['Ready for prioritization'] } })).toMatchObject({ authority: 'none', intent: 'refresh-planning' });
  });
  it.each(['oauthClient', 'integration', 'app'])('preserves %s attribution without interpreting it as a human', (type) => {
    expect(read({ ...fixture(), actor: { id: fixture().actor.id, type } })).toMatchObject({ actor: { type }, authority: 'none' });
  });
  it('allows a deleted actor but never invents a replacement approval', () => {
    expect(read({ ...fixture(), actor: null })).toMatchObject({ actor: null, authority: 'none' });
  });
  it.each([undefined, '', 'a'.repeat(63), 'z'.repeat(64), 'a'.repeat(65)])('rejects malformed signature %s', (signature) => {
    expect(() => read(fixture(), { signature })).toThrow('signature');
  });
  it('verifies exact bytes rather than parsed and reserialized JSON', () => {
    const rawBody = Buffer.from(JSON.stringify(fixture(), null, 2));
    expect(() => read(fixture(), { rawBody, signature: sign(Buffer.from(JSON.stringify(fixture()))) })).toThrow('mismatch');
    expect(read(fixture(), { rawBody, signature: sign(rawBody) }).authority).toBe('none');
  });
  it('rejects another signing key and missing configuration', () => {
    expect(() => read(fixture(), { secret: 'another-key' })).toThrow('mismatch');
    expect(() => read(fixture(), { secret: '' })).toThrow('secret');
    expect(() => read(fixture(), { policy: {} })).toThrow('configured');
  });
  it.each([now - 60_001, now + 60_001, 0, '1700000000000', 1.5])('rejects invalid or old transport time %s', (webhookTimestamp) => {
    expect(() => read({ ...fixture(), webhookTimestamp })).toThrow('timestamp');
  });
  it('allows documented clock skew inside the replay window', () => {
    expect(read({ ...fixture(), webhookTimestamp: now + 60_000 }).sentAt).toBe(now + 60_000);
  });
  it.each(['organizationId', 'webhookId'])('rejects a validly signed foreign %s', (field) => {
    expect(() => read({ ...fixture(), [field]: fixture().data.id })).toThrow('configured service');
  });
  it('deduplicates transport retries and JSON ordering using signed logical content', () => {
    const event = fixture();
    const reordered = Object.fromEntries(Object.entries(event).reverse());
    reordered.webhookTimestamp = now + 1000;
    const first = read(event);
    const retry = read(reordered);
    expect(retry.eventId).toBe(first.eventId);
    expect(retry.rawBodySha256).not.toBe(first.rawBodySha256);
    expect(read({ ...event, data: { ...event.data, body: 'Different decision' } }).eventId).not.toBe(first.eventId);
  });
  it('distinguishes actor, action and change history for otherwise similar events', () => {
    const first = read().eventId;
    for (const event of [{ ...fixture(), actor: null }, { ...fixture(), action: 'remove' }, { ...fixture(), updatedFrom: { body: 'Earlier' } }]) {
      expect(read(event).eventId).not.toBe(first);
    }
  });
  it('makes issue deletion a refresh trigger, not a complete issue snapshot or completion claim', () => {
    expect(read({ ...fixture(), type: 'Issue', action: 'remove' })).toMatchObject({ intent: 'refresh-planning', authority: 'none' });
    expect(read()).not.toHaveProperty('issue');
  });
  it('does not dispatch work for unsupported models', () => {
    expect(read({ ...fixture(), type: 'Project' })).toMatchObject({ intent: 'ignore-unsupported-event', issueId: null, authority: 'none' });
  });
  it('rejects malformed identities and incomplete comment linkage', () => {
    expect(() => read({ ...fixture(), data: { id: fixture().data.id } })).toThrow('comment issue');
    expect(() => read({ ...fixture(), actor: {} })).toThrow('actor');
    expect(() => read({ ...fixture(), createdAt: 'invalid' })).toThrow('data-change');
  });
  it('rejects excessive bodies, unsigned bytes and invalid signed JSON', () => {
    expect(() => read(fixture(), { rawBody: Buffer.alloc(1_048_577) })).toThrow('bounded');
    expect(() => read(fixture(), { rawBody: '{}' })).toThrow('raw request');
    const rawBody = Buffer.from('{');
    expect(() => read(fixture(), { rawBody, signature: sign(rawBody) })).toThrow('JSON');
  });
  it('bounds nesting even when a body has a valid signature', () => {
    let nested = {};
    for (let i = 0; i < 70; i++) nested = { nested };
    expect(() => read({ ...fixture(), extra: nested })).toThrow('nesting');
  });
});
