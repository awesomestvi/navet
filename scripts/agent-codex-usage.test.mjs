import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { observeCodexUsage } from './agent-codex-usage.mjs';

const threadId = 'verified-worker';
const meta = { type: 'session_meta', payload: { id: threadId, base_instructions: 'PRIVATE_PROMPT' } };
function usage(total = 1200, timestamp = 2000) {
  return { type: 'token_usage_record', timestamp: new Date(timestamp).toISOString(), payload: {
    thread_id: threadId, thread_token_usage: { input_tokens: total - 200, cached_input_tokens: 800,
      output_tokens: 200, reasoning_output_tokens: 100, total_tokens: total },
  } };
}
function direct(id = 'call-1') {
  return { type: 'response_item', payload: { type: 'custom_tool_call', call_id: id, name: 'exec', input: 'PRIVATE_ARGUMENT' } };
}
function nested(id = 'operation-1', status = 'completed') {
  return { type: 'event_msg', payload: { type: 'item_completed', thread_id: threadId,
    item: { type: 'McpToolCall', id, status, arguments: { credential: 'PRIVATE_ARGUMENT' }, result: 'PRIVATE_OUTPUT' } } };
}
async function observe(records, tail = '', identity = threadId) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'navet-usage-test-'));
  const sessionFile = path.join(directory, 'session.jsonl');
  try {
    await writeFile(sessionFile, records.map((record) => JSON.stringify(record) + '\n').join('') + tail);
    return await observeCodexUsage({ sessionFile, threadId: identity }, { now: 5000 });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('reports whole-thread totals, cached input and distinct operation counters without private content', async () => {
  const result = await observe([meta, direct(), nested(), usage()]);
  assert.equal(result.modelTokens, 1200);
  assert.equal(result.tokenUsage.cached_input_tokens, 800);
  assert.equal(result.directToolCalls, 1);
  assert.equal(result.recordedNestedOperations, 1);
  assert.equal(result.observedOperationUnits, 2);
  assert.equal(result.source.observedAt, 2000);
  assert.equal(result.snapshotAt, 5000);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/);
});
test('deduplicates replayed call and operation identities', async () => {
  const result = await observe([meta, direct(), direct(), nested(), nested(), usage(), usage()]);
  assert.equal(result.observedOperationUnits, 2);
});
test('records an in-flight operation without claiming execution completion', async () => {
  const result = await observe([meta, nested('pending', 'inProgress'), usage()]);
  assert.equal(result.recordedNestedOperations, 1);
  assert.match(result.coverage, /In-flight/);
});
test('does not count model messages or tool outputs as new calls', async () => {
  const result = await observe([meta, { type: 'response_item', payload: { type: 'function_call_output', call_id: 'x', output: 'PRIVATE_OUTPUT' } }, usage()]);
  assert.equal(result.observedOperationUnits, 0);
});
test('ignores an unfinished writer tail and preserves its presence in evidence', async () => {
  const result = await observe([meta, usage()], '{"type":"token_usage_record"');
  assert.equal(result.modelTokens, 1200);
  assert.equal(result.source.ignoredPartialTail, true);
});
test('rejects malformed complete records', async () => {
  await assert.rejects(observe([meta, usage()], '{bad}\n'), /Malformed complete/);
});
test('rejects wrong session identity', async () => {
  await assert.rejects(observe([meta, usage()], '', 'other-worker'), /identity/);
});
test('rejects foreign-thread token records', async () => {
  const record = usage(); record.payload.thread_id = 'foreign';
  await assert.rejects(observe([meta, record]), /another thread/);
});
test('rejects foreign-thread nested operations', async () => {
  const record = nested(); record.payload.thread_id = 'foreign';
  await assert.rejects(observe([meta, record, usage()]), /matching thread/);
});
test('missing usage is not reported as zero, including rate-limit-only current records', async () => {
  await assert.rejects(observe([meta]), /missing/);
  await assert.rejects(observe([meta, { type: 'event_msg', payload: { type: 'token_count', info: null } }]), /missing/);
});
test('rejects regressing counters and observation times', async () => {
  await assert.rejects(observe([meta, usage(1300), usage(1200, 3000)]), /regressing/);
  await assert.rejects(observe([meta, usage(1200, 3000), usage(1300, 2000)]), /observation time/);
});
test('rejects invalid totals and future observations', async () => {
  const record = usage(); record.payload.thread_token_usage.total_tokens = Number.MAX_SAFE_INTEGER + 1;
  await assert.rejects(observe([meta, record]), /Invalid/);
  await assert.rejects(observe([meta, usage(1200, 6000)]), /observation time/);
});
test('requires metadata and a stable tool-call identity', async () => {
  await assert.rejects(observe([usage()]), /metadata/);
  const record = direct(); delete record.payload.call_id;
  await assert.rejects(observe([meta, record, usage()]), /stable identity/);
});
test('rejects an empty evidence file', async () => {
  await assert.rejects(observe([]), /empty or unavailable/);
});

function tokenCount(total = 1200, timestamp = 2000) {
  return { type: 'event_msg', timestamp: new Date(timestamp).toISOString(), payload: {
    type: 'token_count', info: { total_token_usage: usage(total).payload.thread_token_usage,
      last_token_usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 }, model_context_window: 258400 },
    rate_limits: { private: 'PRIVATE_LIMITS' },
  } };
}
test('reads current token_count cumulative totals with session identity and redacted provenance', async () => {
  const result = await observe([meta, tokenCount(), tokenCount(1300, 3000)]);
  assert.equal(result.modelTokens, 1300);
  assert.equal(result.tokenUsage.cached_input_tokens, 800);
  assert.equal(result.source.observedAt, 3000);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|last_token_usage|rate_limits/);
});
test('ignores rate-limit-only events without making a prior measurement fresh', async () => {
  const result = await observe([meta, tokenCount(), { type: 'event_msg', payload: { type: 'token_count', info: null } }]);
  assert.equal(result.modelTokens, 1200);
  assert.equal(result.source.observedAt, 2000);
});
test('validates current counters, timestamps and optional explicit thread identity', async () => {
  await assert.rejects(observe([meta, tokenCount(1300), tokenCount(1200, 3000)]), /regressing/);
  await assert.rejects(observe([meta, tokenCount(1200, 3000), tokenCount(1300, 2000)]), /observation time/);
  await assert.rejects(observe([meta, tokenCount(1200, 6000)]), /observation time/);
  await assert.rejects(observe([tokenCount()]), /metadata/);
  const foreign = tokenCount(); foreign.payload.thread_id = 'foreign';
  await assert.rejects(observe([meta, foreign]), /another thread/);
  const malformed = tokenCount(); delete malformed.payload.info.total_token_usage.output_tokens;
  await assert.rejects(observe([meta, malformed]), /Invalid/);
});
