import { dispatchEntityCommand } from '@navet/app/services/integration-action.service';
import { integrationStore } from '@navet/app/stores/integration-store';
import type { HabitRule } from '@navet/core/habits';
import { resolveSunPosition, supportsHabitSuggestions } from '@navet/core/habits';
import type { HomeEvent, HomeEventAction, HomeEventSource } from '@navet/core/home-events';
import type { NavetEntity, NavetEntityEvent } from '@navet/core/types';
import { consumeHabitCommandAttribution } from './command-attribution';
import { useHabitStore } from './habit-store';

let initialized = false;
let stopRuleRunner: (() => void) | null = null;
let stopIntegrationSubscription: (() => void) | null = null;

type OccupancyState = NonNullable<HomeEvent['context']['occupancy']>;
type UserPresenceState = NonNullable<HomeEvent['context']['userPresence']>;

interface HomeContextIndex {
  luxByRoomId: Map<string, number | null>;
  occupancyByRoomId: Map<string, OccupancyState>;
  userPresence: UserPresenceState;
}

function resolveDomain(entity: NavetEntity) {
  if (entity.externalId.includes('.')) {
    return entity.externalId.split('.', 1)[0] ?? entity.type;
  }

  return entity.type;
}

function normalizePresenceValue(value: unknown): 'home' | 'away' | 'unknown' {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.trim().toLowerCase();
  if (['home', 'on'].includes(normalized)) {
    return 'home';
  }

  if (['away', 'not_home', 'off'].includes(normalized)) {
    return 'away';
  }

  return 'unknown';
}

function normalizeOccupancyState(value: unknown): 'occupied' | 'vacant' | 'unknown' {
  if (typeof value === 'boolean') {
    return value ? 'occupied' : 'vacant';
  }

  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.trim().toLowerCase();
  if (['on', 'home', 'occupied', 'motion', 'present'].includes(normalized)) {
    return 'occupied';
  }

  if (['off', 'vacant', 'clear', 'away', 'not_home'].includes(normalized)) {
    return 'vacant';
  }

  return 'unknown';
}

function buildHomeContextIndex(entities: Record<string, NavetEntity>): HomeContextIndex {
  const luxByRoomId = new Map<string, number | null>();
  const occupancyByRoomId = new Map<string, OccupancyState>();
  let userPresence: UserPresenceState = 'unknown';

  for (const entity of Object.values(entities)) {
    if (entity.type === 'person' && userPresence === 'unknown') {
      const nextPresence = normalizePresenceValue(entity.primaryState);
      if (nextPresence !== 'unknown') {
        userPresence = nextPresence;
      }
    }

    const roomId = entity.room;
    if (!roomId) {
      continue;
    }

    if (
      entity.type === 'binary_sensor' &&
      !occupancyByRoomId.has(roomId) &&
      /(occup|motion|presence)/i.test(String(entity.name))
    ) {
      occupancyByRoomId.set(roomId, normalizeOccupancyState(entity.primaryState));
    }

    if (entity.type !== 'sensor' || luxByRoomId.has(roomId)) {
      continue;
    }

    const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
    const deviceClass = String(entity.attributes.device_class ?? '').toLowerCase();
    if (unit.includes('lx') || unit.includes('lux') || deviceClass === 'illuminance') {
      const numericState =
        typeof entity.primaryState === 'number'
          ? entity.primaryState
          : Number(entity.primaryState ?? Number.NaN);
      luxByRoomId.set(roomId, Number.isFinite(numericState) ? numericState : null);
    }
  }

  return {
    luxByRoomId,
    occupancyByRoomId,
    userPresence,
  };
}

function resolveLux(contextIndex: HomeContextIndex, roomId?: string) {
  return roomId ? (contextIndex.luxByRoomId.get(roomId) ?? null) : null;
}

function resolveOccupancy(contextIndex: HomeContextIndex, roomId?: string): OccupancyState {
  return roomId ? (contextIndex.occupancyByRoomId.get(roomId) ?? 'unknown') : 'unknown';
}

function resolveAction(
  previousEntity: NavetEntity,
  nextEntity: NavetEntity
): HomeEventAction | null {
  const previousState = previousEntity.primaryState;
  const currentState = nextEntity.primaryState;

  if (Object.is(previousState, currentState)) {
    return null;
  }

  const previousOn = previousState === 'on' || previousState === true;
  const currentOn = currentState === 'on' || currentState === true;

  if (!previousOn && currentOn) {
    return 'turned_on';
  }

  if (previousOn && !currentOn) {
    return 'turned_off';
  }

  const domain = resolveDomain(nextEntity);
  if (domain === 'person') {
    return 'presence_changed';
  }

  if (
    domain === 'sensor' &&
    (String(nextEntity.attributes.device_class ?? '').toLowerCase() === 'power' ||
      String(nextEntity.name).toLowerCase().includes('energy') ||
      String(nextEntity.name).toLowerCase().includes('power'))
  ) {
    return 'energy_sampled';
  }

  return 'state_changed';
}

function shouldCollectAction(action: HomeEventAction, entity: NavetEntity) {
  if (action === 'turned_on' || action === 'turned_off') {
    return supportsHabitSuggestions(resolveDomain(entity));
  }

  if (action === 'energy_sampled') {
    return typeof entity.primaryState === 'number' && entity.primaryState >= 1500;
  }

  return false;
}

function buildHomeEvent(
  previousEntity: NavetEntity,
  nextEntity: NavetEntity,
  action: HomeEventAction,
  contextIndex: HomeContextIndex
): HomeEvent {
  const timestamp = nextEntity.lastUpdated ?? new Date().toISOString();
  const commandAttribution = consumeHabitCommandAttribution({
    entityId: nextEntity.canonicalId,
    action: action === 'turned_on' ? 'turn_on' : action === 'turned_off' ? 'turn_off' : 'other',
    at: timestamp,
  });
  const source: HomeEventSource = commandAttribution ? 'navet' : 'unknown';
  const domain = resolveDomain(nextEntity);

  return {
    id: `event:${nextEntity.canonicalId}:${timestamp}:${action}`,
    providerId: nextEntity.providerId,
    entityId: nextEntity.id,
    canonicalEntityId: nextEntity.canonicalId,
    domain,
    roomId: nextEntity.room,
    action,
    source,
    timestamp,
    previousState: previousEntity.primaryState,
    currentState: nextEntity.primaryState,
    context: {
      roomId: nextEntity.room,
      occupancy: resolveOccupancy(contextIndex, nextEntity.room),
      lux: resolveLux(contextIndex, nextEntity.room),
      sunPosition: resolveSunPosition(timestamp),
      userPresence: contextIndex.userPresence,
      previousState: previousEntity.primaryState,
      currentState: nextEntity.primaryState,
      metadata: {
        availability: nextEntity.availability,
      },
    },
  };
}

function getNewProviderEntityEvents(
  events: readonly NavetEntityEvent[],
  previousEvents: readonly NavetEntityEvent[]
) {
  if (events === previousEvents) {
    return [];
  }

  const previousEventSet = new Set(previousEvents);
  return events.filter((event) => !previousEventSet.has(event));
}

function getCurrentEntities() {
  return integrationStore.getState().providerEntitiesByCanonicalId;
}

function ruleMatchesContext(
  rule: HabitRule,
  entities: Record<string, NavetEntity>,
  contextIndex: HomeContextIndex
) {
  const firstEntity = rule.action.entityIds[0] ? entities[rule.action.entityIds[0]] : undefined;
  const roomId = rule.trigger.roomId ?? firstEntity?.room;
  const occupancy = resolveOccupancy(contextIndex, roomId);
  const lux = resolveLux(contextIndex, roomId);
  const presence = contextIndex.userPresence;

  if (
    rule.trigger.occupancy &&
    rule.trigger.occupancy !== 'any' &&
    occupancy !== rule.trigger.occupancy
  ) {
    return false;
  }

  if (
    rule.trigger.presence &&
    rule.trigger.presence !== 'any' &&
    presence !== rule.trigger.presence
  ) {
    return false;
  }

  if (typeof rule.trigger.luxBelow === 'number' && (lux == null || lux > rule.trigger.luxBelow)) {
    return false;
  }

  return true;
}

function shouldRunRuleNow(rule: HabitRule, now: Date) {
  const day = now.getDay();
  if (!rule.trigger.days.includes(day)) {
    return false;
  }

  const minute = now.getHours() * 60 + now.getMinutes();
  if (minute < rule.trigger.startMinute || minute > rule.trigger.endMinute) {
    return false;
  }

  if (rule.lastTriggeredAt) {
    const lastTriggered = new Date(rule.lastTriggeredAt);
    if (
      lastTriggered.getFullYear() === now.getFullYear() &&
      lastTriggered.getMonth() === now.getMonth() &&
      lastTriggered.getDate() === now.getDate()
    ) {
      return false;
    }
  }

  return true;
}

async function runEligibleRules() {
  const store = useHabitStore.getState();
  if (!store.enabled || !store.rules.length) {
    return;
  }

  const now = new Date();
  const entities = getCurrentEntities();
  const contextIndex = buildHomeContextIndex(entities);

  for (const rule of store.rules) {
    if (!rule.enabled || rule.action.type === 'notify') {
      continue;
    }

    if (!shouldRunRuleNow(rule, now) || !ruleMatchesContext(rule, entities, contextIndex)) {
      continue;
    }

    for (const entityId of rule.action.entityIds) {
      await dispatchEntityCommand({
        type: rule.action.type,
        entityId,
      });
    }

    await useHabitStore.getState().saveRule({
      ...rule,
      lastTriggeredAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }
}

export function initializeHabitEngine() {
  if (initialized) {
    return;
  }

  initialized = true;
  void useHabitStore.getState().initialize();

  stopIntegrationSubscription = integrationStore.subscribe((state, previousState) => {
    if (!useHabitStore.getState().enabled) {
      return;
    }

    const providerEvents = getNewProviderEntityEvents(
      state.providerEvents,
      previousState.providerEvents
    );
    if (providerEvents.length === 0) {
      return;
    }

    const nextEntities = state.providerEntitiesByCanonicalId;
    let contextIndex: HomeContextIndex | null = null;
    const nextEvents: HomeEvent[] = [];
    for (const providerEvent of providerEvents) {
      if (providerEvent.type !== 'entity_updated' || !providerEvent.entity) {
        continue;
      }

      const previousEntity = previousState.providerEntitiesByCanonicalId[providerEvent.entityId];
      const action = previousEntity ? resolveAction(previousEntity, providerEvent.entity) : null;
      if (!previousEntity || !action || !shouldCollectAction(action, providerEvent.entity)) {
        continue;
      }

      contextIndex ??= buildHomeContextIndex(nextEntities);
      nextEvents.push(buildHomeEvent(previousEntity, providerEvent.entity, action, contextIndex));
    }

    for (const event of nextEvents) {
      void useHabitStore.getState().appendEvent(event);
    }
  });

  const intervalId = window.setInterval(() => {
    void runEligibleRules();
  }, 60_000);
  stopRuleRunner = () => {
    window.clearInterval(intervalId);
  };
}

export function stopHabitEngine() {
  stopRuleRunner?.();
  stopRuleRunner = null;
  stopIntegrationSubscription?.();
  stopIntegrationSubscription = null;
  initialized = false;
}
