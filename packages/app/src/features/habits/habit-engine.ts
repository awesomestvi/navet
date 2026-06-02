import { dispatchEntityCommand } from '@navet/app/services/integration-action.service';
import { integrationStore } from '@navet/app/stores/integration-store';
import type { HabitRule } from '@navet/core/habits';
import { resolveSunPosition, supportsHabitSuggestions } from '@navet/core/habits';
import type { HomeEvent, HomeEventAction, HomeEventSource } from '@navet/core/home-events';
import type { NavetEntity } from '@navet/core/types';
import { consumeHabitCommandAttribution } from './command-attribution';
import { useHabitStore } from './habit-store';

let initialized = false;
let stopRuleRunner: (() => void) | null = null;
let stopIntegrationSubscription: (() => void) | null = null;

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

function resolveLux(entities: Record<string, NavetEntity>, roomId?: string) {
  if (!roomId) {
    return null;
  }

  for (const entity of Object.values(entities)) {
    if (entity.room !== roomId || entity.type !== 'sensor') {
      continue;
    }

    const unit = String(entity.attributes.unit_of_measurement ?? '').toLowerCase();
    const deviceClass = String(entity.attributes.device_class ?? '').toLowerCase();
    if (unit.includes('lx') || unit.includes('lux') || deviceClass === 'illuminance') {
      const numericState =
        typeof entity.primaryState === 'number'
          ? entity.primaryState
          : Number(entity.primaryState ?? Number.NaN);
      return Number.isFinite(numericState) ? numericState : null;
    }
  }

  return null;
}

function resolveOccupancy(entities: Record<string, NavetEntity>, roomId?: string) {
  if (!roomId) {
    return 'unknown';
  }

  for (const entity of Object.values(entities)) {
    if (entity.room !== roomId) {
      continue;
    }

    if (entity.type === 'binary_sensor' && /(occup|motion|presence)/i.test(String(entity.name))) {
      return normalizeOccupancyState(entity.primaryState);
    }
  }

  return 'unknown';
}

function resolveUserPresence(entities: Record<string, NavetEntity>) {
  for (const entity of Object.values(entities)) {
    if (entity.type !== 'person') {
      continue;
    }

    const presence = normalizePresenceValue(entity.primaryState);
    if (presence !== 'unknown') {
      return presence;
    }
  }

  return 'unknown';
}

function resolveAction(
  previousEntity: NavetEntity,
  nextEntity: NavetEntity
): HomeEventAction | null {
  const previousState = previousEntity.primaryState;
  const currentState = nextEntity.primaryState;

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

  if (previousState !== currentState) {
    return 'state_changed';
  }

  return null;
}

function buildHomeEvent(
  previousEntity: NavetEntity,
  nextEntity: NavetEntity,
  entities: Record<string, NavetEntity>
): HomeEvent | null {
  const action = resolveAction(previousEntity, nextEntity);
  if (!action) {
    return null;
  }

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
      occupancy: resolveOccupancy(entities, nextEntity.room),
      lux: resolveLux(entities, nextEntity.room),
      sunPosition: resolveSunPosition(timestamp),
      userPresence: resolveUserPresence(entities),
      previousState: previousEntity.primaryState,
      currentState: nextEntity.primaryState,
      metadata: {
        availability: nextEntity.availability,
      },
    },
  };
}

function shouldCollectEvent(event: HomeEvent) {
  if (event.action === 'turned_on' || event.action === 'turned_off') {
    return supportsHabitSuggestions(event.domain);
  }

  if (event.action === 'energy_sampled') {
    return typeof event.currentState === 'number' && event.currentState >= 1500;
  }

  return false;
}

function getCurrentEntities() {
  return integrationStore.getState().providerEntitiesByCanonicalId;
}

function ruleMatchesContext(rule: HabitRule, entities: Record<string, NavetEntity>) {
  const firstEntity = rule.action.entityIds[0] ? entities[rule.action.entityIds[0]] : undefined;
  const roomId = rule.trigger.roomId ?? firstEntity?.room;
  const occupancy = resolveOccupancy(entities, roomId);
  const lux = resolveLux(entities, roomId);
  const presence = resolveUserPresence(entities);

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

  for (const rule of store.rules) {
    if (!rule.enabled || rule.action.type === 'notify') {
      continue;
    }

    if (!shouldRunRuleNow(rule, now) || !ruleMatchesContext(rule, entities)) {
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

  let previousEntities = getCurrentEntities();
  stopIntegrationSubscription = integrationStore.subscribe((state) => {
    const nextEntities = state.providerEntitiesByCanonicalId;
    const baselineMissing = Object.keys(previousEntities).length === 0;
    if (baselineMissing) {
      previousEntities = nextEntities;
      return;
    }

    const nextEvents: HomeEvent[] = [];
    for (const [canonicalId, nextEntity] of Object.entries(nextEntities)) {
      const previousEntity = previousEntities[canonicalId];
      if (!previousEntity) {
        continue;
      }

      const event = buildHomeEvent(previousEntity, nextEntity, nextEntities);
      if (event && shouldCollectEvent(event)) {
        nextEvents.push(event);
      }
    }

    previousEntities = nextEntities;
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
