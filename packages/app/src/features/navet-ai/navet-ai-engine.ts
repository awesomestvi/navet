import { integrationStore } from '@navet/app/stores/integration-store';
import type { HomeEvent, HomeEventAction } from '@navet/core/home-events';
import {
  isAllowedIntelligenceDomain,
  resolveIntelligenceSunPosition,
} from '@navet/core/intelligence';
import type {
  PlatformEntityHistoryPoint,
  PlatformEntityHistorySeries,
} from '@navet/core/provider-feature-models';
import type { NavetEntity, NavetEntityEvent } from '@navet/core/types';
import { navetAiService } from './navet-ai.service';
import { useNavetAiStore } from './navet-ai-store';

let initialized = false;
let unsubscribe: (() => void) | null = null;
let queuedEvents: HomeEvent[] = [];
let flushTimer: number | null = null;
let powerFlushTimer: number | null = null;
let backfillStarted = false;
let backfillRetryAfter = 0;
const pendingPowerEvents = new Map<string, { hour: string; event: HomeEvent }>();

const BACKFILL_ENTITY_BATCH_SIZE = 5;
const BACKFILL_EVENT_BATCH_SIZE = 200;
const BACKFILL_EVENT_BATCH_BYTES = 384 * 1024;
const BACKFILL_RETRY_DELAY_MS = 5 * 60_000;

type HistoryLoader = (request: {
  entityIds: string[];
  startTime: string;
  significantChangesOnly: boolean;
}) => Promise<PlatformEntityHistorySeries[]>;

type EventAppender<Result> = (batch: {
  events: HomeEvent[];
  backfillComplete?: boolean;
}) => Promise<Result>;

export function isNavetAiBackfillReady(options: {
  inProgress: boolean;
  completedAt?: string | null;
  retryAfter: number;
  now?: number;
}) {
  return (
    !options.inProgress && !options.completedAt && (options.now ?? Date.now()) >= options.retryAfter
  );
}

export async function loadNavetAiBackfillHistories(
  entityIds: readonly string[],
  startTime: string,
  loadHistories: HistoryLoader
) {
  const histories: PlatformEntityHistorySeries[] = [];
  for (let index = 0; index < entityIds.length; index += BACKFILL_ENTITY_BATCH_SIZE) {
    histories.push(
      ...(await loadHistories({
        entityIds: entityIds.slice(index, index + BACKFILL_ENTITY_BATCH_SIZE),
        startTime,
        significantChangesOnly: true,
      }))
    );
  }
  return histories;
}

export function splitNavetAiBackfillEvents(
  events: readonly HomeEvent[],
  limits: { maxEvents?: number; maxBytes?: number } = {}
) {
  const maxEvents = limits.maxEvents ?? BACKFILL_EVENT_BATCH_SIZE;
  const maxBytes = limits.maxBytes ?? BACKFILL_EVENT_BATCH_BYTES;
  const encoder = new TextEncoder();
  const payloadOverhead = encoder.encode('{"events":[]}').byteLength;
  const batches: HomeEvent[][] = [];
  let batch: HomeEvent[] = [];
  let batchBytes = payloadOverhead;

  for (const event of events) {
    const eventBytes = encoder.encode(JSON.stringify(event)).byteLength;
    const separatorBytes = batch.length > 0 ? 1 : 0;
    if (
      batch.length > 0 &&
      (batch.length >= maxEvents || batchBytes + separatorBytes + eventBytes > maxBytes)
    ) {
      batches.push(batch);
      batch = [];
      batchBytes = payloadOverhead;
    }
    batch.push(event);
    batchBytes += (batch.length > 1 ? 1 : 0) + eventBytes;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

export async function uploadNavetAiEventBatches<Result>(
  events: readonly HomeEvent[],
  append: EventAppender<Result>
) {
  let latest: Result | undefined;
  for (const batch of splitNavetAiBackfillEvents(events)) {
    latest = await append({ events: batch });
  }
  return latest;
}

export async function uploadNavetAiBackfill<Result>(
  events: readonly HomeEvent[],
  append: EventAppender<Result>
) {
  await uploadNavetAiEventBatches(events, append);
  return append({ events: [], backfillComplete: true });
}

export function selectHourlyMaximumPowerPoints(points: readonly PlatformEntityHistoryPoint[]) {
  const maximumByHour = new Map<string, PlatformEntityHistoryPoint>();
  for (const point of points) {
    const value = Number(point.state);
    if (!Number.isFinite(value)) continue;
    const hour = point.changedAt.slice(0, 13);
    const current = maximumByHour.get(hour);
    if (!current || value > Number(current.state)) maximumByHour.set(hour, point);
  }
  return [...maximumByHour.values()].sort((left, right) =>
    left.changedAt.localeCompare(right.changedAt)
  );
}

export function coalesceHourlyPowerEvent(
  existing: { hour: string; event: HomeEvent } | undefined,
  event: HomeEvent
) {
  const hour = event.timestamp.slice(0, 13);
  if (!existing) return { pending: { hour, event } };
  if (existing.hour !== hour) {
    return { completed: existing.event, pending: { hour, event } };
  }
  return {
    pending:
      Number(event.currentState) > Number(existing.event.currentState) ? { hour, event } : existing,
  };
}

async function migrateLegacyHabitEvidence() {
  if (typeof indexedDB === 'undefined') return;
  const request = indexedDB.open('navet-habits');
  const database = await new Promise<IDBDatabase | null>((resolve) => {
    request.onerror = () => resolve(null);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(null);
    };
    request.onsuccess = () => resolve(request.result);
  });
  if (!database) return;
  const readAll = <T>(name: string) =>
    new Promise<T[]>((resolve) => {
      if (!database.objectStoreNames.contains(name)) return resolve([]);
      const value = database.transaction(name, 'readonly').objectStore(name).getAll();
      value.onerror = () => resolve([]);
      value.onsuccess = () => resolve(value.result as T[]);
    });
  const [events, feedback] = await Promise.all([
    readAll<HomeEvent>('events'),
    readAll<{ insightId?: string; candidateId?: string; outcome?: string; reason?: string }>(
      'feedback'
    ),
  ]);
  if (events.length > 0) await uploadNavetAiEventBatches(events, navetAiService.appendEvents);
  for (const item of feedback) {
    if (!item.candidateId) continue;
    const outcome =
      item.outcome === 'dont_suggest'
        ? 'hide_similar'
        : item.outcome === 'remind_later'
          ? 'snoozed'
          : item.outcome === 'dismissed'
            ? 'dismissed'
            : null;
    if (!outcome) continue;
    await navetAiService.addFeedback({
      insightId: item.insightId ?? `insight:${item.candidateId}`,
      evidenceId: item.candidateId,
      outcome,
      reason: item.reason === 'not_useful' ? 'not_relevant' : 'other',
    });
  }
  database.close();
  indexedDB.deleteDatabase('navet-habits');
}

function domainOf(entity: NavetEntity) {
  return entity.externalId.includes('.')
    ? (entity.externalId.split('.', 1)[0] ?? entity.type)
    : entity.type;
}

function isPowerEntity(entity: NavetEntity) {
  if (domainOf(entity) !== 'sensor') return false;
  const deviceClass = String(entity.attributes.device_class ?? '')
    .trim()
    .toLowerCase();
  const unit = String(entity.attributes.unit_of_measurement ?? '')
    .trim()
    .toLowerCase();
  return deviceClass === 'power' || unit === 'w' || unit === 'kw';
}

function powerWatts(entity: NavetEntity, value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const unit = String(entity.attributes.unit_of_measurement ?? '')
    .trim()
    .toLowerCase();
  return unit === 'kw' ? numeric * 1_000 : numeric;
}

function isPresenceEntity(entity: NavetEntity) {
  return (
    entity.type === 'person' ||
    (entity.type === 'binary_sensor' && /(occup|motion|presence)/i.test(entity.name))
  );
}

function isObservableEntity(entity: NavetEntity) {
  return (
    isAllowedIntelligenceDomain(domainOf(entity)) ||
    isPowerEntity(entity) ||
    isPresenceEntity(entity)
  );
}

function normalizePresence(value: unknown): 'home' | 'away' | 'unknown' {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (['home', 'on'].includes(normalized)) return 'home';
  if (['away', 'not_home', 'off'].includes(normalized)) return 'away';
  return 'unknown';
}

function normalizeOccupancy(value: unknown): 'occupied' | 'vacant' | 'unknown' {
  if (typeof value === 'boolean') return value ? 'occupied' : 'vacant';
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (['on', 'occupied', 'motion', 'present'].includes(normalized)) return 'occupied';
  if (['off', 'vacant', 'clear'].includes(normalized)) return 'vacant';
  return 'unknown';
}

function buildContext(entities: Record<string, NavetEntity>) {
  const occupancy = new Map<string, 'occupied' | 'vacant' | 'unknown'>();
  const lux = new Map<string, number | null>();
  let presence: 'home' | 'away' | 'unknown' = 'unknown';
  for (const entity of Object.values(entities)) {
    if (entity.type === 'person' && presence === 'unknown')
      presence = normalizePresence(entity.primaryState);
    if (!entity.room) continue;
    if (
      entity.type === 'binary_sensor' &&
      /(occup|motion|presence)/i.test(entity.name) &&
      !occupancy.has(entity.room)
    ) {
      occupancy.set(entity.room, normalizeOccupancy(entity.primaryState));
    }
    const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
    if (
      entity.type === 'sensor' &&
      (unit.includes('lux') || unit.includes('lx')) &&
      !lux.has(entity.room)
    ) {
      const value = Number(entity.primaryState);
      lux.set(entity.room, Number.isFinite(value) ? value : null);
    }
  }
  return { occupancy, lux, presence };
}

function resolveObservedChange(
  previous: NavetEntity,
  current: NavetEntity
): HomeEventAction | null {
  if (Object.is(previous.primaryState, current.primaryState)) return null;
  if (isPresenceEntity(current)) return 'presence_changed';
  const wasOn = previous.primaryState === 'on' || previous.primaryState === true;
  const isOn = current.primaryState === 'on' || current.primaryState === true;
  if (!wasOn && isOn) return 'turned_on';
  if (wasOn && !isOn) return 'turned_off';
  if (isPowerEntity(current) && powerWatts(current, current.primaryState) !== null)
    return 'energy_sampled';
  return null;
}

function newEvents(events: readonly NavetEntityEvent[], previous: readonly NavetEntityEvent[]) {
  if (events === previous) return [];
  const known = new Set(previous);
  return events.filter((event) => !known.has(event));
}

function schedulePowerFlush() {
  if (powerFlushTimer !== null || pendingPowerEvents.size === 0) return;
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setMinutes(60, 0, 0);
  powerFlushTimer = window.setTimeout(
    () => {
      powerFlushTimer = null;
      queuedEvents.push(...[...pendingPowerEvents.values()].map(({ event }) => event));
      pendingPowerEvents.clear();
      if (queuedEvents.length > 0) scheduleFlush();
    },
    Math.max(1_000, nextHour.getTime() - now.getTime())
  );
}

function queueObservedEvent(event: HomeEvent) {
  if (event.action !== 'energy_sampled') {
    queuedEvents.push(event);
    return;
  }
  const existing = pendingPowerEvents.get(event.canonicalEntityId);
  const { completed, pending } = coalesceHourlyPowerEvent(existing, event);
  if (completed) queuedEvents.push(completed);
  pendingPowerEvents.set(event.canonicalEntityId, pending);
  schedulePowerFlush();
}

async function backfillHistory() {
  if (
    !isNavetAiBackfillReady({
      inProgress: backfillStarted,
      completedAt: useNavetAiStore.getState().state?.historyBackfilledAt,
      retryAfter: backfillRetryAfter,
    })
  ) {
    return;
  }
  const entities = Object.values(integrationStore.getState().providerEntitiesByCanonicalId).filter(
    isObservableEntity
  );
  if (entities.length === 0) return;
  backfillStarted = true;
  try {
    const { getIntegrationEntityHistories } = await import(
      '@navet/app/services/integration-history.service'
    );
    const histories = await loadNavetAiBackfillHistories(
      entities.slice(0, 80).map((entity) => entity.canonicalId),
      new Date(Date.now() - 30 * 86_400_000).toISOString(),
      getIntegrationEntityHistories
    );
    const entityById = new Map(entities.map((entity) => [entity.canonicalId, entity]));
    const events: HomeEvent[] = [];
    for (const series of histories) {
      const entity = entityById.get(series.entityId);
      if (!entity) continue;
      if (isPowerEntity(entity)) {
        for (const point of selectHourlyMaximumPowerPoints(series.points)) {
          const currentState = powerWatts(entity, point.state);
          if (currentState === null) continue;
          events.push({
            id: `ai-history:${series.entityId}:${point.changedAt.slice(0, 13)}:energy_sampled`,
            providerId: entity.providerId,
            entityId: entity.id,
            canonicalEntityId: entity.canonicalId,
            domain: domainOf(entity),
            roomId: entity.room,
            action: 'energy_sampled',
            source: 'unknown',
            timestamp: point.changedAt,
            currentState,
            context: {
              roomId: entity.room,
              sunPosition: resolveIntelligenceSunPosition(point.changedAt),
              currentState,
            },
          });
        }
        continue;
      }
      for (let index = 1; index < series.points.length; index += 1) {
        const previous = series.points[index - 1];
        const current = series.points[index];
        if (!previous || !current || previous.state === current.state) continue;
        const observedChange: HomeEventAction | null = isPresenceEntity(entity)
          ? 'presence_changed'
          : current.state === 'on'
            ? 'turned_on'
            : previous.state === 'on'
              ? 'turned_off'
              : null;
        if (!observedChange) continue;
        events.push({
          id: `ai-history:${series.entityId}:${current.changedAt}:${observedChange}`,
          providerId: entity.providerId,
          entityId: entity.id,
          canonicalEntityId: entity.canonicalId,
          domain: domainOf(entity),
          roomId: entity.room,
          action: observedChange,
          source: 'unknown',
          timestamp: current.changedAt,
          previousState: previous.state,
          currentState: current.state,
          context: {
            roomId: entity.room,
            sunPosition: resolveIntelligenceSunPosition(current.changedAt),
            previousState: previous.state,
            currentState: current.state,
          },
        });
      }
    }
    const next = await uploadNavetAiBackfill(events, navetAiService.appendEvents);
    useNavetAiStore.setState({ state: next, error: null });
    backfillRetryAfter = 0;
  } catch {
    backfillRetryAfter = Date.now() + BACKFILL_RETRY_DELAY_MS;
  } finally {
    backfillStarted = false;
  }
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    const batch = queuedEvents.splice(0, queuedEvents.length);
    if (batch.length === 0) return;
    void uploadNavetAiEventBatches(batch, navetAiService.appendEvents).then(
      (state) => {
        if (state) useNavetAiStore.setState({ state, error: null });
      },
      () => queuedEvents.unshift(...batch)
    );
  }, 1_500);
}

export function initializeNavetAiEngine() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  void useNavetAiStore
    .getState()
    .initialize()
    .then(migrateLegacyHabitEvidence)
    .then(backfillHistory)
    .catch(() => undefined);
  unsubscribe = integrationStore.subscribe((state, previousState) => {
    void backfillHistory();
    const context = buildContext(state.providerEntitiesByCanonicalId);
    for (const providerEvent of newEvents(state.providerEvents, previousState.providerEvents)) {
      if (providerEvent.type !== 'entity_updated' || !providerEvent.entity) continue;
      const previous = previousState.providerEntitiesByCanonicalId[providerEvent.entityId];
      if (!previous) continue;
      const observedChange = resolveObservedChange(previous, providerEvent.entity);
      const domain = domainOf(providerEvent.entity);
      if (!observedChange) continue;
      if (!isObservableEntity(providerEvent.entity)) continue;
      const timestamp = providerEvent.entity.lastUpdated ?? new Date().toISOString();
      const previousValue =
        observedChange === 'energy_sampled'
          ? powerWatts(providerEvent.entity, previous.primaryState)
          : previous.primaryState;
      const currentValue =
        observedChange === 'energy_sampled'
          ? powerWatts(providerEvent.entity, providerEvent.entity.primaryState)
          : providerEvent.entity.primaryState;
      queueObservedEvent({
        id: `ai-event:${providerEvent.entity.canonicalId}:${timestamp}:${observedChange}`,
        providerId: providerEvent.entity.providerId,
        entityId: providerEvent.entity.id,
        canonicalEntityId: providerEvent.entity.canonicalId,
        domain,
        roomId: providerEvent.entity.room,
        action: observedChange,
        source: 'unknown',
        timestamp,
        previousState: previousValue,
        currentState: currentValue,
        context: {
          roomId: providerEvent.entity.room,
          occupancy: providerEvent.entity.room
            ? (context.occupancy.get(providerEvent.entity.room) ?? 'unknown')
            : 'unknown',
          lux: providerEvent.entity.room
            ? (context.lux.get(providerEvent.entity.room) ?? null)
            : null,
          sunPosition: resolveIntelligenceSunPosition(timestamp),
          userPresence: context.presence,
          previousState: previousValue,
          currentState: currentValue,
        },
      });
    }
    if (queuedEvents.length > 0) scheduleFlush();
  });
}

export function stopNavetAiEngine() {
  unsubscribe?.();
  unsubscribe = null;
  initialized = false;
  backfillStarted = false;
  backfillRetryAfter = 0;
  if (flushTimer !== null) window.clearTimeout(flushTimer);
  if (powerFlushTimer !== null) window.clearTimeout(powerFlushTimer);
  flushTimer = null;
  powerFlushTimer = null;
  queuedEvents = [];
  pendingPowerEvents.clear();
}
