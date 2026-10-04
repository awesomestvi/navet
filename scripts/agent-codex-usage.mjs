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
export async function observeCodexUsage({ sessionFile, threadId }, { now = Date.now(), signal, maxSnapshotBytes = 134_217_728 } = {}) {
  if (typeof sessionFile !== 'string' || !sessionFile || typeof threadId !== 'string' || !threadId ||
    !Number.isFinite(now) || !Number.isSafeInteger(maxSnapshotBytes) || maxSnapshotBytes < 1 || maxSnapshotBytes > 536_870_912) {
    throw new Error('A session file, confirmed thread ID and bounded snapshot policy are required.');
  }
  if (signal?.aborted) throw new Error('Canceled native usage read.');
  const file = path.resolve(sessionFile);
  const snapshot = await stat(file);
  if (!snapshot.isFile() || snapshot.size === 0) throw new Error('Codex session evidence is empty or unavailable.');
  if (snapshot.size > maxSnapshotBytes) throw new Error('Codex session evidence is oversized.');
  const direct = new Set();
  const nested = new Set();
  let metadata = false;
  let totals = null;
  let source = null;
  let nativeTurn = null;
  let buffer = '';
  let lineNumber = 0;

  function accept(line) {
    if (Buffer.byteLength(line) > 16 * 1024 * 1024) throw new Error('Session record exceeds the observation size limit.');
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
    if (record.type === 'event_msg' && ['task_started', 'task_complete', 'turn_aborted'].includes(payload.type)) {
      const observedAt = Date.parse(record.timestamp);
      if (typeof payload.turn_id !== 'string' || !payload.turn_id || !Number.isSafeInteger(observedAt) ||
          observedAt > now || (nativeTurn && observedAt < nativeTurn.observedAt) ||
          (payload.thread_id !== undefined && payload.thread_id !== threadId)) {
        throw new Error('Invalid native turn identity or observation time.');
      }
      if (payload.type !== 'task_started' && nativeTurn?.runId !== payload.turn_id) {
        throw new Error('Terminal usage marker requires its preceding native turn start.');
      }
      if (payload.type === 'task_started' && nativeTurn?.runId === payload.turn_id && nativeTurn.status !== 'running') {
        throw new Error('A terminal native turn ID cannot restart.');
      }
      nativeTurn = { runId: payload.turn_id, status: payload.type === 'task_started' ? 'running'
        : payload.type === 'task_complete' ? 'completed' : 'interrupted', observedAt, line: lineNumber,
        startedAt: payload.type === 'task_started' ? observedAt : nativeTurn.startedAt,
        startLine: payload.type === 'task_started' ? lineNumber : nativeTurn.startLine };
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
      if (nativeTurn && nativeTurn.status !== 'running') throw new Error('Operation follows a terminal native turn.');
      if (typeof payload.call_id !== 'string' || !payload.call_id) throw new Error('Tool call has no stable identity.');
      direct.add(payload.call_id);
    }
    if (record.type === 'event_msg' && payload.type === 'item_completed' && operationTypes.has(payload.item?.type)) {
      // Native cancellation can precede the final command receipt. This is evidence for an
      // already-started operation, never permission for a new operation after interruption.
      if (nativeTurn && nativeTurn.status !== 'running') {
        const recordedAt = Date.parse(record.timestamp);
        if (payload.turn_id !== nativeTurn.runId ||
            !['completed', 'failed'].includes(payload.item.status) ||
            !Number.isSafeInteger(payload.started_at_ms) || !Number.isSafeInteger(payload.completed_at_ms) ||
            payload.started_at_ms < nativeTurn.startedAt || payload.started_at_ms > nativeTurn.observedAt ||
            payload.completed_at_ms < payload.started_at_ms || payload.completed_at_ms > now ||
            !Number.isSafeInteger(recordedAt) || recordedAt < payload.completed_at_ms || recordedAt > now) {
          throw new Error('Operation follows a terminal native turn without a verified completion receipt.');
        }
      }
      if (payload.thread_id !== threadId || typeof payload.item.id !== 'string' || !payload.item.id) {
        throw new Error('Nested operation has no matching thread or stable identity.');
      }
      nested.add(payload.item.id);
    }
  }

  for await (const chunk of createReadStream(file, { encoding: 'utf8', start: 0, end: snapshot.size - 1, signal })) {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      accept(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
    if (Buffer.byteLength(buffer) > 16 * 1024 * 1024) throw new Error('Session record exceeds the observation size limit.');
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
    ...(nativeTurn ? { nativeTurn } : {}),
    coverage: 'Whole-thread token totals including cached input; direct tool calls plus recorded nested operation units. In-flight completion, hidden operations and provider-enforced limits are not established.',
  };
}
