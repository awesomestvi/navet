import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { totalmem } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { spawn } from 'node:child_process';
import type { HomeEvent } from '../../packages/core/src/home-events';
import {
  interpretSimpleControlSuggestion,
  interpretSimpleStateQuestion,
  isExplicitIntelligenceControlRequest,
  validateControlSuggestions,
  type IntelligenceControlSuggestion,
  type IntelligenceEntityReference,
} from '../../packages/core/src/intelligence-chat';
import {
  buildIntelligenceHardwareProfile,
  detectInsightEvidence,
  toNavetInsight,
  validateInsightNarration,
  type InsightFeedback,
  type NavetInsight,
} from '../../packages/core/src/intelligence';

const DATA_DIRECTORY = process.env.NAVET_AI_DATA_DIRECTORY || '/data/navet-ai';
const MODEL_DIRECTORY = join(DATA_DIRECTORY, 'models');
const DATABASE_PATH = join(DATA_DIRECTORY, 'navet-ai.sqlite');
const PORT = Number(process.env.NAVET_AI_PORT || 8098);
const RAW_RETENTION_MS = 30 * 86_400_000;
const AGGREGATE_RETENTION_MS = 366 * 86_400_000;
const MAX_BODY_BYTES = 512 * 1024;
const LLAMA_CLI = process.env.NAVET_AI_LLAMA_CLI || '/usr/local/bin/llama-cli';

const MODEL_MANIFEST = {
  'qwen3.5-0.8b': {
    file: 'qwen3.5-0.8b-q4_0.gguf',
    url:
      process.env.NAVET_AI_QWEN_08B_URL ||
      'https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/resolve/8fea620810c4afa23dd6443f999a48574c1611a3/Qwen3.5-0.8B-Q4_0.gguf',
    sha256:
      process.env.NAVET_AI_QWEN_08B_SHA256 ||
      '57d1997790d1744fba5b40a7317df71ea5e2acee28c47e78f0cce39c0703f8cf',
    downloadBytes: 563_036_064,
  },
  'qwen3.5-2b': {
    file: 'qwen3.5-2b-q4_k_m.gguf',
    url:
      process.env.NAVET_AI_QWEN_2B_URL ||
      'https://huggingface.co/bartowski/Qwen_Qwen3.5-2B-GGUF/resolve/7d26695454df6de5fbcce2e58681e62dae06ce43/Qwen_Qwen3.5-2B-Q4_K_M.gguf',
    sha256:
      process.env.NAVET_AI_QWEN_2B_SHA256 ||
      '57a1085840f497d764a7fc5d346922dbde961efb54cc792ea81d694fd846a1d8',
    downloadBytes: 1_396_198_496,
  },
} as const;

mkdirSync(MODEL_DIRECTORY, { recursive: true });
const db = new DatabaseSync(DATABASE_PATH);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, entity_id TEXT NOT NULL,
    room_id TEXT, domain TEXT NOT NULL, observed_change TEXT NOT NULL,
    timestamp TEXT NOT NULL, payload TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_timestamp ON events(timestamp);
  CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, evidence_id TEXT NOT NULL, timestamp TEXT NOT NULL, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS insights (id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, locale TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(id, locale));
  CREATE INDEX IF NOT EXISTS insights_created_at ON insights(created_at);
  CREATE TABLE IF NOT EXISTS aggregates (bucket TEXT PRIMARY KEY, updated_at TEXT NOT NULL, payload TEXT NOT NULL);
`);

function setting(key: string, fallback: string) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: string } | undefined;
  return row?.value ?? fallback;
}

function setSetting(key: string, value: string) {
  db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
}

const configuredMemoryGb = Number(process.env.NAVET_AI_MEMORY_GB);
const memoryGb =
  Number.isFinite(configuredMemoryGb) && configuredMemoryGb > 0
    ? configuredMemoryGb
    : totalmem() / 1024 ** 3;
const hardware = buildIntelligenceHardwareProfile({ tier: memoryGb < 6 ? 'low' : memoryGb < 12 ? 'medium' : 'high', memoryGb });
const modelId = hardware.preferredModelId;
const modelPath = join(MODEL_DIRECTORY, MODEL_MANIFEST[modelId].file);
const partialModelPath = `${modelPath}.partial`;
if (existsSync(partialModelPath)) unlinkSync(partialModelPath);
let modelStatus: 'not_downloaded' | 'downloading' | 'ready' | 'error' = existsSync(modelPath)
  ? 'ready'
  : 'not_downloaded';
let modelDownloadedBytes = modelStatus === 'ready' ? MODEL_MANIFEST[modelId].downloadBytes : 0;
let modelDownloadController: AbortController | null = null;

function capabilities() {
  return {
    available: true, readOnly: true as const, supportsHistoryBackfill: true,
    storageOwner: 'installation' as const, rawRetentionDays: 30, aggregateRetentionMonths: 12,
    model: {
      status: modelStatus,
      selectedId: modelId,
      downloadBytes: MODEL_MANIFEST[modelId].downloadBytes,
      downloadedBytes: modelDownloadedBytes,
    },
  };
}

function listFeedback(): InsightFeedback[] {
  return (db.prepare('SELECT payload FROM feedback ORDER BY timestamp').all() as Array<{ payload: string }>).flatMap((row) => {
    try { return [JSON.parse(row.payload) as InsightFeedback]; } catch { return []; }
  });
}

function listInsights(locale = setting('locale', 'en')): NavetInsight[] {
  return (db.prepare('SELECT payload FROM insights WHERE locale = ? ORDER BY created_at DESC LIMIT 100').all(locale) as Array<{ payload: string }>).flatMap((row) => {
    try { return [JSON.parse(row.payload) as NavetInsight]; } catch { return []; }
  });
}

function state(locale = setting('locale', 'en')) {
  return {
    contract: 'navet.ai' as const, version: 1 as const,
    settings: {
      enabled: setting('enabled', 'true') === 'true',
      dailyGenerationEnabled: setting('daily_generation', 'true') === 'true',
      locale: setting('locale', 'en'),
      modelDownloadConsented: setting('model_consent', 'false') === 'true',
    },
    capabilities: capabilities(), insights: listInsights(locale), feedback: listFeedback(),
    eventCount: Number((db.prepare('SELECT COUNT(*) count FROM events').get() as { count: number }).count),
    lastGeneratedAt: setting('last_generated_at', '') || null,
    historyBackfilledAt: setting('history_backfilled_at', '') || null,
  };
}

function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function body(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > MAX_BODY_BYTES) throw new Error('request_too_large');
    chunks.push(value);
  }
  return chunks.length ? (JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown) : {};
}

function sanitizeChatText(value: unknown, limit: number) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function sanitizeChatEntity(value: unknown): IntelligenceEntityReference | null {
  if (!value || typeof value !== 'object') return null;
  const entity = value as Record<string, unknown>;
  const id = sanitizeChatText(entity.id, 512);
  const providerId = sanitizeChatText(entity.providerId, 80);
  const name = sanitizeChatText(entity.name, 120);
  if (!id || !providerId || !name) return null;
  const room = sanitizeChatText(entity.room, 120) || undefined;
  if (entity.type === 'temperature') {
    if (typeof entity.value !== 'number' || !Number.isFinite(entity.value)) return null;
    if (entity.unit !== '°C' && entity.unit !== '°F' && entity.unit !== 'K') return null;
    return { id, providerId, name, room, type: 'temperature', value: entity.value, unit: entity.unit };
  }
  if (entity.type !== 'light' && entity.type !== 'switch') return null;
  return {
    id,
    providerId,
    name,
    room,
    type: entity.type,
    state: entity.state === 'on' || entity.state === 'off' ? entity.state : 'unknown',
  };
}

function parseJsonObject(output: string) {
  const match = output.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as unknown;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function safeState(value: unknown): string | number | boolean | null | undefined {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return ['on', 'off', 'home', 'away', 'not_home', 'unknown', 'unavailable'].includes(normalized)
    ? normalized
    : undefined;
}

function sanitizeEvent(value: unknown): HomeEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (
    typeof event.id !== 'string' ||
    typeof event.providerId !== 'string' ||
    typeof event.entityId !== 'string' ||
    typeof event.canonicalEntityId !== 'string' ||
    typeof event.domain !== 'string' ||
    typeof event.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(event.timestamp))
  ) {
    return null;
  }
  const action = String(event.action);
  const domainAllowed =
    (['light', 'switch'].includes(event.domain) && ['turned_on', 'turned_off'].includes(action)) ||
    (event.domain === 'sensor' && action === 'energy_sampled') ||
    (['person', 'binary_sensor'].includes(event.domain) && action === 'presence_changed');
  if (!domainAllowed) return null;
  const context = event.context && typeof event.context === 'object'
    ? (event.context as Record<string, unknown>)
    : {};
  const previousState = safeState(event.previousState);
  const currentState = safeState(event.currentState);
  return {
    id: event.id.slice(0, 512),
    providerId: event.providerId as HomeEvent['providerId'],
    entityId: event.entityId.slice(0, 256),
    canonicalEntityId: event.canonicalEntityId.slice(0, 512),
    domain: event.domain,
    roomId: typeof event.roomId === 'string' ? event.roomId.slice(0, 256) : undefined,
    action: action as HomeEvent['action'],
    source: ['manual', 'automation', 'provider', 'navet', 'unknown'].includes(String(event.source))
      ? (event.source as HomeEvent['source'])
      : 'unknown',
    timestamp: event.timestamp,
    previousState,
    currentState,
    context: {
      roomId: typeof context.roomId === 'string' ? context.roomId.slice(0, 256) : undefined,
      occupancy: ['occupied', 'vacant', 'unknown'].includes(String(context.occupancy))
        ? (context.occupancy as NonNullable<HomeEvent['context']['occupancy']>)
        : 'unknown',
      lux: typeof context.lux === 'number' && Number.isFinite(context.lux) ? context.lux : null,
      sunPosition: ['night', 'dawn', 'day', 'dusk', 'unknown'].includes(String(context.sunPosition))
        ? (context.sunPosition as NonNullable<HomeEvent['context']['sunPosition']>)
        : 'unknown',
      userPresence: ['home', 'away', 'unknown'].includes(String(context.userPresence))
        ? (context.userPresence as NonNullable<HomeEvent['context']['userPresence']>)
        : 'unknown',
      previousState,
      currentState,
    },
  };
}

function updateAggregates(events: HomeEvent[]) {
  const buckets = new Map<string, HomeEvent[]>();
  for (const event of events) {
    const bucket = event.timestamp.slice(0, 10);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), event]);
  }
  const select = db.prepare('SELECT payload FROM aggregates WHERE bucket = ?');
  const upsert = db.prepare(
    'INSERT INTO aggregates(bucket, updated_at, payload) VALUES (?, ?, ?) ON CONFLICT(bucket) DO UPDATE SET updated_at=excluded.updated_at, payload=excluded.payload'
  );
  for (const [bucket, bucketEvents] of buckets) {
    const existing = select.get(bucket) as { payload?: string } | undefined;
    let aggregate: { eventCount: number; byDomain: Record<string, number>; byAction: Record<string, number> } = {
      eventCount: 0,
      byDomain: {},
      byAction: {},
    };
    try {
      if (existing?.payload) aggregate = JSON.parse(existing.payload) as typeof aggregate;
    } catch {
      // Replace an unreadable aggregate with a valid, minimal bucket.
    }
    for (const event of bucketEvents) {
      aggregate.eventCount += 1;
      aggregate.byDomain[event.domain] = (aggregate.byDomain[event.domain] ?? 0) + 1;
      aggregate.byAction[event.action] = (aggregate.byAction[event.action] ?? 0) + 1;
    }
    upsert.run(bucket, new Date().toISOString(), JSON.stringify(aggregate));
  }
}

function retain() {
  db.prepare('DELETE FROM events WHERE timestamp < ?').run(new Date(Date.now() - RAW_RETENTION_MS).toISOString());
  db.prepare('DELETE FROM aggregates WHERE bucket < ?').run(
    new Date(Date.now() - AGGREGATE_RETENTION_MS).toISOString().slice(0, 10)
  );
}

function loadEvents(): HomeEvent[] {
  return (db.prepare('SELECT payload FROM events ORDER BY timestamp').all() as Array<{ payload: string }>).flatMap((row) => {
    try {
      const value = sanitizeEvent(JSON.parse(row.payload));
      return value ? [value] : [];
    } catch {
      return [];
    }
  });
}

function compactLegacyEnergySamples() {
  if (setting('energy_compaction_version', '0') === '2') return;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      WITH ranked_energy_samples AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY entity_id, substr(timestamp, 1, 13)
            ORDER BY CAST(json_extract(payload, '$.currentState') AS REAL) DESC, timestamp DESC, id DESC
          ) AS sample_rank
        FROM events
        WHERE observed_change = 'energy_sampled'
      )
      DELETE FROM events
      WHERE id IN (
        SELECT id FROM ranked_energy_samples WHERE sample_rank > 1
      );
      UPDATE events
      SET
        id = 'energy-hour:' || entity_id || ':' || substr(timestamp, 1, 13),
        payload = json_set(
          payload,
          '$.id',
          'energy-hour:' || entity_id || ':' || substr(timestamp, 1, 13)
        )
      WHERE observed_change = 'energy_sampled';
      DELETE FROM aggregates;
    `);
    updateAggregates(loadEvents());
    setSetting('energy_compaction_version', '2');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

compactLegacyEnergySamples();

async function runModelPrompt(
  prompt: string,
  maxTokens: number,
  signal?: AbortSignal
): Promise<string | null> {
  if (modelStatus !== 'ready' || !existsSync(LLAMA_CLI) || signal?.aborted) return null;
  return await new Promise((resolve) => {
    const child = spawn(
      LLAMA_CLI,
      [
        '-m',
        modelPath,
        '-p',
        prompt,
        '-n',
        String(maxTokens),
        '--temp',
        '0.2',
        '--no-display-prompt',
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    );
    let output = '';
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      resolve(value);
    };
    const abort = () => {
      child.kill('SIGKILL');
      finish(null);
    };
    const timeout = setTimeout(abort, hardware.tier === 'low' ? 60_000 : 45_000);
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (chunk) => {
      if (output.length < 24_000) output += String(chunk);
    });
    child.on('close', () => finish(output));
    child.on('error', () => finish(null));
  });
}

async function runLlama(
  evidence: ReturnType<typeof detectInsightEvidence>,
  locale: string
): Promise<Array<{ evidenceId: string; title: string; summary: string }>> {
  if (evidence.length === 0) return [];
  const input = evidence.map((item) => ({
    evidenceId: item.id,
    confidence: item.confidence,
    sampleCount: item.sampleCount,
    facts: item.facts,
  }));
  const prompt = `Rank the supplied verified smart-home evidence by usefulness. Return only a JSON array. Each item must contain evidenceId, title, and summary, in locale ${locale}. Do not add facts, advice, commands, automation, notifications, or device control. Evidence: ${JSON.stringify(input)}`;
  const output = await runModelPrompt(prompt, 420);
  const match = output?.match(/\[[\s\S]*\]/);
  try {
    const parsed = match ? (JSON.parse(match[0]) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    const knownIds = new Set(evidence.map((item) => item.id));
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.evidenceId !== 'string' || !knownIds.has(candidate.evidenceId)) {
        return [];
      }
      const narration = validateInsightNarration(candidate);
      return narration ? [{ evidenceId: candidate.evidenceId, ...narration }] : [];
    });
  } catch {
    return [];
  }
}

async function chat(input: unknown, signal?: AbortSignal) {
  const candidate = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const text = sanitizeChatText(candidate.text, 1_200);
  const locale = sanitizeChatText(candidate.locale, 35) || 'en';
  if (!text) throw new Error('invalid_chat_request');
  const entities = Array.isArray(candidate.entities)
    ? candidate.entities
        .slice(0, 120)
        .map(sanitizeChatEntity)
        .filter((entity): entity is IntelligenceEntityReference => entity !== null)
    : [];
  const history = Array.isArray(candidate.history)
    ? candidate.history.slice(-8).flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const message = item as Record<string, unknown>;
        if (message.role !== 'user' && message.role !== 'assistant') return [];
        const historyText = sanitizeChatText(message.text, 600);
        return historyText ? [{ role: message.role, text: historyText }] : [];
      })
    : [];
  const deterministicSuggestions = interpretSimpleControlSuggestion(text, entities);
  const deterministicAnswer = interpretSimpleStateQuestion(text, entities);
  const prompt = `You are Navet AI, a local read-only smart-home assistant. Answer in locale ${locale}. You may explain current entity state and interpret a request into suggestions, but you never execute, trigger, schedule, or claim to have changed anything. Use only the supplied entities. Return only JSON with shape {"reply":"short answer","suggestions":[{"operation":"turn_on|turn_off","entityIds":["known id"]}]}. If the user requests control, describe the interpretation as a suggestion. Conversation: ${JSON.stringify(history)}. Entities: ${JSON.stringify(entities)}. User: ${JSON.stringify(text)}`;
  const output = await runModelPrompt(prompt, 360, signal);
  const parsed = output ? parseJsonObject(output) : null;
  const modelSuggestions = validateControlSuggestions(parsed?.suggestions, entities);
  const suggestions: IntelligenceControlSuggestion[] =
    deterministicSuggestions.length > 0 ? deterministicSuggestions : modelSuggestions;
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));

  return {
    contract: 'navet.ai.chat' as const,
    version: 1 as const,
    modelId,
    reply: deterministicAnswer ? '' : sanitizeChatText(parsed?.reply, 1_200),
    answer: deterministicAnswer ?? undefined,
    readOnly: true as const,
    executionRequested:
      deterministicSuggestions.length > 0 && isExplicitIntelligenceControlRequest(text),
    suggestions: suggestions.map((suggestion) => ({
      operation: suggestion.operation,
      targets: suggestion.entityIds.flatMap((id) => {
        const entity = entityById.get(id);
        return entity ? [{ id, name: entity.name, room: entity.room }] : [];
      }),
    })),
  };
}

async function generate(locale: string) {
  if (setting('enabled', 'true') !== 'true') return;
  retain();
  const evidence = detectInsightEvidence({ events: loadEvents(), feedback: listFeedback(), profile: hardware });
  const now = new Date();
  const insert = db.prepare('INSERT INTO insights(id, status, created_at, locale, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id, locale) DO UPDATE SET status=excluded.status, created_at=excluded.created_at, payload=excluded.payload');
  const selectedEvidence = evidence.slice(0, hardware.tier === 'low' ? 5 : 12);
  const narrated = await runLlama(selectedEvidence, locale);
  const narrationById = new Map(narrated.map((item) => [item.evidenceId, item]));
  const rankById = new Map(narrated.map((item, index) => [item.evidenceId, index]));
  const rankedEvidence = [...selectedEvidence].sort(
    (left, right) =>
      (rankById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (rankById.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
      right.confidence - left.confidence
  );
  for (const item of rankedEvidence) {
    const narration = narrationById.get(item.id);
    const insight = toNavetInsight(item, narration, now);
    if (narration) insight.narration = { modelId, locale, generatedAt: now.toISOString() };
    insert.run(insight.id, insight.status, insight.createdAt, locale, JSON.stringify(insight));
  }
  setSetting('locale', locale);
  setSetting('last_generated_at', now.toISOString());
}

async function downloadModel() {
  if (modelStatus === 'downloading' || modelStatus === 'ready') return;
  modelStatus = 'downloading';
  modelDownloadedBytes = 0;
  const manifest = MODEL_MANIFEST[modelId];
  const controller = new AbortController();
  modelDownloadController = controller;
  try {
    const response = await fetch(manifest.url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error(`model_download_${response.status}`);
    const sizeLimit = new Transform({
      transform(chunk, _encoding, callback) {
        modelDownloadedBytes += chunk.length;
        if (modelDownloadedBytes > manifest.downloadBytes) {
          callback(new Error('model_download_too_large'));
          return;
        }
        callback(null, chunk);
      },
    });
    await pipeline(
      Readable.fromWeb(response.body as never),
      sizeLimit,
      createWriteStream(partialModelPath, { mode: 0o600 })
    );
    if (modelDownloadedBytes !== manifest.downloadBytes)
      throw new Error('model_download_size_mismatch');
    if (manifest.sha256) {
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(partialModelPath)) hash.update(chunk);
      if (hash.digest('hex') !== manifest.sha256) throw new Error('model_checksum_mismatch');
    }
    renameSync(partialModelPath, modelPath);
    modelStatus = 'ready';
  } catch {
    if (existsSync(partialModelPath)) unlinkSync(partialModelPath);
    modelDownloadedBytes = 0;
    modelStatus = controller.signal.aborted ? 'not_downloaded' : 'error';
  } finally {
    if (modelDownloadController === controller) modelDownloadController = null;
  }
}

function cancelModelDownload() {
  if (modelStatus !== 'downloading') return;
  modelStatus = 'not_downloaded';
  modelDownloadedBytes = 0;
  setSetting('model_consent', 'false');
  modelDownloadController?.abort();
}

function deleteModel() {
  cancelModelDownload();
  if (existsSync(modelPath)) unlinkSync(modelPath);
  modelStatus = 'not_downloaded';
  modelDownloadedBytes = 0;
  setSetting('model_consent', 'false');
}

async function route(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url || '/', 'http://localhost');
  const path = url.pathname.replace(/^\/__navet_ai__/, '');
  if (request.method === 'GET' && path === '/capabilities') return send(response, 200, capabilities());
  if (request.method === 'GET' && path === '/state') return send(response, 200, state((url.searchParams.get('locale') || 'en').slice(0, 35)));
  if (request.method === 'POST' && path === '/events') {
    const input = (await body(request)) as { events?: unknown[]; backfillComplete?: boolean };
    const insert = db.prepare('INSERT OR IGNORE INTO events(id, provider_id, entity_id, room_id, domain, observed_change, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const selectPayload = db.prepare('SELECT payload FROM events WHERE id = ?');
    const updateEnergySample = db.prepare(
      'UPDATE events SET timestamp = ?, payload = ? WHERE id = ?'
    );
    const safeEvents = (input.events ?? [])
      .slice(0, 200)
      .map(sanitizeEvent)
      .filter((event): event is HomeEvent => event !== null);
    const insertedEvents: HomeEvent[] = [];
    for (const event of safeEvents) {
      if (event.action === 'energy_sampled') {
        const storageId = `energy-hour:${event.canonicalEntityId}:${event.timestamp.slice(0, 13)}`;
        const storedEvent = { ...event, id: storageId };
        const existing = selectPayload.get(storageId) as { payload?: string } | undefined;
        let existingValue = Number.NEGATIVE_INFINITY;
        try {
          if (existing?.payload) {
            existingValue = Number((JSON.parse(existing.payload) as HomeEvent).currentState);
          }
        } catch {
          // Replace an unreadable hourly sample with the new valid observation.
        }
        if (existing) {
          if (Number(storedEvent.currentState) > existingValue) {
            updateEnergySample.run(
              storedEvent.timestamp,
              JSON.stringify(storedEvent),
              storageId
            );
          }
          continue;
        }
        const result = insert.run(
          storageId,
          storedEvent.providerId,
          storedEvent.canonicalEntityId,
          storedEvent.roomId ?? null,
          storedEvent.domain,
          storedEvent.action,
          storedEvent.timestamp,
          JSON.stringify(storedEvent)
        );
        if (result.changes > 0) insertedEvents.push(storedEvent);
        continue;
      }
      const result = insert.run(
        event.id,
        event.providerId,
        event.canonicalEntityId,
        event.roomId ?? null,
        event.domain,
        event.action,
        event.timestamp,
        JSON.stringify(event)
      );
      if (result.changes > 0) insertedEvents.push(event);
    }
    updateAggregates(insertedEvents);
    if (input.backfillComplete === true) {
      setSetting('history_backfilled_at', new Date().toISOString());
    }
    retain();
    return send(response, 200, state());
  }
  if (request.method === 'POST' && path === '/feedback') {
    const input = await body(request) as Partial<InsightFeedback>;
    if (typeof input.insightId !== 'string' || typeof input.evidenceId !== 'string' || !['helpful', 'not_useful', 'hide_similar', 'snoozed', 'dismissed'].includes(String(input.outcome))) return send(response, 400, { error: 'Invalid feedback' });
    const timestamp = new Date().toISOString();
    const feedback = { ...input, id: `feedback:${input.evidenceId}:${Date.now()}`, timestamp } as InsightFeedback;
    db.prepare('INSERT INTO feedback(id, evidence_id, timestamp, payload) VALUES (?, ?, ?, ?)').run(feedback.id, feedback.evidenceId, timestamp, JSON.stringify(feedback));
    if (input.outcome === 'dismissed' || input.outcome === 'hide_similar') db.prepare('UPDATE insights SET status = ? WHERE id = ?').run('dismissed', input.insightId);
    return send(response, 200, state());
  }
  if (request.method === 'POST' && path === '/generate') {
    const input = await body(request) as { locale?: string };
    await generate(typeof input.locale === 'string' ? input.locale.slice(0, 35) : 'en');
    return send(response, 200, state());
  }
  if (request.method === 'POST' && path === '/chat') {
    const abortController = new AbortController();
    response.once('close', () => abortController.abort());
    const result = await chat(await body(request), abortController.signal);
    if (!response.destroyed) return send(response, 200, result);
    return;
  }
  if (request.method === 'POST' && path === '/model-consent') {
    setSetting('model_consent', 'true'); void downloadModel(); return send(response, 202, state());
  }
  if (request.method === 'POST' && path === '/model-cancel') {
    cancelModelDownload();
    return send(response, 200, state());
  }
  if (request.method === 'DELETE' && path === '/model') {
    deleteModel();
    return send(response, 200, state());
  }
  if (request.method === 'PATCH' && path === '/settings') {
    const input = await body(request) as Record<string, unknown>;
    if (typeof input.enabled === 'boolean') setSetting('enabled', String(input.enabled));
    if (typeof input.dailyGenerationEnabled === 'boolean') setSetting('daily_generation', String(input.dailyGenerationEnabled));
    return send(response, 200, state());
  }
  if (request.method === 'POST' && path === '/reset') {
    db.exec('DELETE FROM events; DELETE FROM feedback; DELETE FROM insights; DELETE FROM aggregates;');
    return send(response, 200, state());
  }
  return send(response, 404, { error: 'Navet AI resource not found' });
}

createServer((request, response) => {
  void route(request, response).catch((error) => send(response, error instanceof Error && error.message === 'request_too_large' ? 413 : 500, { error: 'Navet AI service error' }));
}).listen(PORT, '127.0.0.1');

let lastDailyKey = '';
setInterval(() => {
  const now = new Date();
  const key = now.toISOString().slice(0, 10);
  if (setting('daily_generation', 'true') === 'true' && now.getHours() === 5 && now.getMinutes() >= 30 && key !== lastDailyKey) {
    lastDailyKey = key;
    void generate(setting('locale', 'en'));
  }
}, 60_000).unref();
