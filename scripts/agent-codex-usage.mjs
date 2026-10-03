import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const operationTypes = new Set(['CommandExecution', 'McpToolCall', 'FileChange', 'Extension', 'ImageView']);
const counters = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];

function validateTotals(value, previous) {
  if (!value || counters.some((key) => !Number.isSafeInteger(value[key]) || value[key] < 0 ||
    (previous && value[key] < previous[key])) ||
    value.cached_input_tokens > value.input_tokens || value.reasoning_output_tokens > value.output_tokens ||
    value.total_tokens !== value.input_tokens + value.output_tokens) {
    throw new Error('Invalid or regressing cumulative Codex token usage.');
  }
  return Object.fromEntries(counters.map((key) => [key, value[key]]));
}

// Observe a fixed complete-record prefix. A live writer's unfinished trailing record is not evidence.
export async function observeCodexUsage({ sessionFile, threadId }, { now = Date.now() } = {}) {
  if (typeof sessionFile !== 'string' || !sessionFile || typeof threadId !== 'string' || !threadId ||
    !Number.isFinite(now)) throw new Error('A session file and confirmed thread ID are required.');
  const file = path.resolve(sessionFile);
  const snapshot = await stat(file);
  if (!snapshot.isFile() || snapshot.size === 0) throw new Error('Codex session evidence is empty or unavailable.');
  const direct = new Set();
  const nested = new Set();
  let metadata = false;
  let totals = null;
  let source = null;
  let buffer = '';
  let lineNumber = 0;

  function accept(line) {
    lineNumber += 1;
    let record;
    try { record = JSON.parse(line); } catch { throw new Error(`Malformed complete session record at line ${lineNumber}.`); }
    const payload = record.payload;
    if (!payload || typeof payload !== 'object') throw new Error(`Invalid session record at line ${lineNumber}.`);
    if (record.type === 'session_meta') {
      if (metadata || payload.id !== threadId) throw new Error('Session identity does not match the confirmed delivery thread.');
      metadata = true;
    } else if (!metadata) {
      throw new Error('Session metadata must precede usage evidence.');
    }
    const currentUsage = record.type === 'event_msg' && payload.type === 'token_count';
    if (record.type === 'token_usage_record' || currentUsage) {
      if ((!currentUsage || payload.thread_id !== undefined) && payload.thread_id !== threadId) {
        throw new Error('Token usage belongs to another thread.');
      }
      // Current token_count events inherit identity from the preceding session metadata.
      // Null info is a rate-limit-only observation, not a new cumulative measurement.
      if (currentUsage && payload.info === null) return;
      const observedAt = Date.parse(record.timestamp);
      if (!Number.isFinite(observedAt) || observedAt > now || (source && observedAt < source.observedAt)) {
        throw new Error('Invalid token observation time.');
      }
      totals = validateTotals(currentUsage ? payload.info.total_token_usage : payload.thread_token_usage, totals);
      source = { line: lineNumber, observedAt };
    }
    if (record.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(payload.type)) {
      if (typeof payload.call_id !== 'string' || !payload.call_id) throw new Error('Tool call has no stable identity.');
      direct.add(payload.call_id);
    }
    if (record.type === 'event_msg' && payload.type === 'item_completed' && operationTypes.has(payload.item?.type)) {
      if (payload.thread_id !== threadId || typeof payload.item.id !== 'string' || !payload.item.id) {
        throw new Error('Nested operation has no matching thread or stable identity.');
      }
      nested.add(payload.item.id);
    }
  }

  for await (const chunk of createReadStream(file, { encoding: 'utf8', start: 0, end: snapshot.size - 1 })) {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      accept(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
    if (buffer.length > 16 * 1024 * 1024) throw new Error('Session record exceeds the observation size limit.');
  }
  if (!metadata || !totals || !source) throw new Error('Verified cumulative token usage is missing; it is not zero usage.');
  return {
    version: 1,
    threadId,
    snapshotAt: now,
    tokenUsage: totals,
    modelTokens: totals.total_tokens,
    directToolCalls: direct.size,
    recordedNestedOperations: nested.size,
    observedOperationUnits: direct.size + nested.size,
    source: { file, ...source, completeLines: lineNumber, snapshotBytes: snapshot.size, ignoredPartialTail: buffer.length > 0 },
    coverage: 'Whole-thread token totals including cached input; direct tool calls plus recorded nested operation units. In-flight completion, hidden operations and provider-enforced limits are not established.',
  };
}
