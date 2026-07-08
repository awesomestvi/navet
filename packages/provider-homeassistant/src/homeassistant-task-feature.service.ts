import type { HabitRule } from '@navet/core/habits';
import type {
  PlatformAutomationCreateResult,
  PlatformTaskEntityMap,
  PlatformTaskRuntimeSnapshot,
} from '@navet/core/provider-feature-models';
import type { ProviderTaskFeatureService } from '@navet/core/provider-feature-services';
import type { HomeAssistantStoreState } from './homeassistant-service-bridge';
import {
  callHomeAssistantService,
  getHomeAssistantAutomationConfig,
  getHomeAssistantStoreState,
  saveHomeAssistantAutomationConfig,
  subscribeHomeAssistantStore,
} from './homeassistant-service-bridge';

const WEEKDAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function mapTaskEntities(state: HomeAssistantStoreState): PlatformTaskEntityMap | null {
  if (!state.entities) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(state.entities).map(([entityId, entity]) => [
      entityId,
      {
        entityId,
        state: entity.state,
        name:
          typeof entity.attributes.friendly_name === 'string'
            ? entity.attributes.friendly_name
            : undefined,
        attributes: entity.attributes,
      },
    ])
  );
}

let cachedSnapshot: {
  entities: HomeAssistantStoreState['entities'];
  areas: HomeAssistantStoreState['areas'];
  deviceRegistry: HomeAssistantStoreState['deviceRegistry'];
  entityRegistry: HomeAssistantStoreState['entityRegistry'];
  snapshot: PlatformTaskRuntimeSnapshot;
} | null = null;

function createHomeAssistantTaskRuntimeSnapshot(
  state: HomeAssistantStoreState
): PlatformTaskRuntimeSnapshot {
  const entities = state.entities;
  const areas = state.areas;
  const deviceRegistry = state.deviceRegistry;
  const entityRegistry = state.entityRegistry;

  if (
    cachedSnapshot &&
    cachedSnapshot.entities === entities &&
    cachedSnapshot.areas === areas &&
    cachedSnapshot.deviceRegistry === deviceRegistry &&
    cachedSnapshot.entityRegistry === entityRegistry
  ) {
    return cachedSnapshot.snapshot;
  }

  const snapshot: PlatformTaskRuntimeSnapshot = {
    entities: mapTaskEntities(state),
    rooms: areas.map((area) => ({ id: area.area_id, name: area.name })),
    devices: deviceRegistry.map((device) => ({ id: device.id, roomId: device.area_id })),
    entityReferences: entityRegistry.map((entity) => ({
      entityId: entity.entity_id,
      roomId: entity.area_id,
      deviceId: entity.device_id,
    })),
  };

  cachedSnapshot = {
    entities,
    areas,
    deviceRegistry,
    entityRegistry,
    snapshot,
  };

  return snapshot;
}

function formatMinuteAsTime(minute: number) {
  const hours = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (minute % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

function slugifyAutomationId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function resolveAutomationConfigKey(rule: HabitRule) {
  const source = rule.sourceCandidateId ?? rule.id;
  const slug = slugifyAutomationId(source.replace(/^rule:/, '').replace(/^habit-candidate:/, ''));
  return `navet_${slug || 'local_habit'}`;
}

function buildHomeAssistantAutomationConfig(
  rule: HabitRule,
  options?: { name?: string; description?: string }
) {
  const alias = options?.name?.trim() || rule.name?.trim() || 'Navet suggested routine';
  const description =
    options?.description?.trim() ||
    rule.description?.trim() ||
    'Created by Navet from a suggested local habit.';
  const service =
    rule.action.type === 'turn_off' ? 'homeassistant.turn_off' : 'homeassistant.turn_on';
  const weekdays = rule.trigger.days
    .map((day) => WEEKDAY_LABELS[day])
    .filter((day): day is (typeof WEEKDAY_LABELS)[number] => Boolean(day));

  return {
    alias,
    description,
    mode: 'single',
    triggers: [
      {
        trigger: 'time',
        at: formatMinuteAsTime(rule.trigger.startMinute),
      },
    ],
    conditions:
      weekdays.length > 0 && weekdays.length < WEEKDAY_LABELS.length
        ? [
            {
              condition: 'time',
              weekday: weekdays,
            },
          ]
        : [],
    actions: [
      {
        action: service,
        target: {
          entity_id: rule.action.entityIds,
        },
      },
    ],
  };
}

export const homeAssistantTaskFeatureService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () =>
    createHomeAssistantTaskRuntimeSnapshot(getHomeAssistantStoreState()),
  subscribeTaskRuntimeSnapshot: (listener) => subscribeHomeAssistantStore(listener),
  getAutomationDetails: async (entityId) => {
    const response = await getHomeAssistantAutomationConfig(entityId);
    return { config: response.config };
  },
  triggerAutomation: async (entityId) =>
    await callHomeAssistantService('automation', 'trigger', {}, { entityId: entityId }),
  createAutomationFromHabitRule: async (rule, options): Promise<PlatformAutomationCreateResult> => {
    if (rule.action.type === 'notify') {
      throw new Error(
        'Home Assistant automation creation does not support notify-only habit rules'
      );
    }

    const automationId = resolveAutomationConfigKey(rule);
    await saveHomeAssistantAutomationConfig(
      automationId,
      buildHomeAssistantAutomationConfig(rule, options)
    );

    return {
      automationId,
      entityId: `automation.${automationId}`,
    };
  },
};
