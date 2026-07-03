import type {
  PlatformTaskDeviceReference,
  PlatformTaskEntityMap,
  PlatformTaskEntityReference,
  PlatformTaskRoomReference,
} from '@navet/app/platform/provider-feature-models';
import type { AutomationTask } from '../types';
import { createTaskRoomMaps, getTaskEntityName, resolveTaskEntityRoom } from './task-runtime';

const RECENT_TRIGGER_WINDOW_MS = 24 * 60 * 60 * 1000;
const ATTENTION_STATES = new Set(['unavailable', 'unknown', 'error', 'failed']);
const NEXT_RUN_ATTRIBUTE_KEYS = [
  'next_run',
  'next_trigger',
  'next_triggered',
  'next_scheduled_run',
  'next_execution',
];

interface MapAutomationTasksOptions {
  entities: PlatformTaskEntityMap | null;
  rooms: PlatformTaskRoomReference[];
  devices: PlatformTaskDeviceReference[];
  entityReferences: PlatformTaskEntityReference[];
  locale?: string;
  now?: Date;
}

function getOptionalStringAttribute(
  attributes: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = attributes[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function parseDateAttribute(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getAttentionReason(state: string): AutomationTask['attentionReason'] | undefined {
  if (state === 'unavailable' || state === 'unknown') {
    return state;
  }

  if (ATTENTION_STATES.has(state)) {
    return 'error';
  }

  return undefined;
}

export function mapAutomationTasks({
  entities,
  rooms,
  devices,
  entityReferences,
  locale,
  now = new Date(),
}: MapAutomationTasksOptions): AutomationTask[] {
  if (!entities) {
    return [];
  }

  const { roomMap, entityReferenceMap, deviceMap } = createTaskRoomMaps({
    rooms,
    devices,
    entityReferences,
  });

  return Object.entries(entities)
    .filter(([entityId]) => entityId.startsWith('automation.'))
    .map(([entityId, entity]) => {
      const enabled = entity.state === 'on';
      const attentionReason = getAttentionReason(entity.state);
      const needsAttention = attentionReason !== undefined;
      const lastTriggered =
        typeof entity.attributes?.last_triggered === 'string'
          ? entity.attributes.last_triggered
          : undefined;
      const lastTriggeredDate = parseDateAttribute(lastTriggered);
      const lastTriggeredTime = lastTriggeredDate?.getTime() ?? 0;
      const nowTime = now.getTime();
      const isRecentlyTriggered =
        lastTriggeredTime > 0 &&
        Number.isFinite(nowTime) &&
        lastTriggeredTime <= nowTime &&
        nowTime - lastTriggeredTime <= RECENT_TRIGGER_WINDOW_MS;
      const status: AutomationTask['status'] = needsAttention
        ? 'attention'
        : enabled
          ? 'active'
          : 'disabled';

      return {
        id: entityId,
        name: getTaskEntityName(entity),
        room: resolveTaskEntityRoom(entityId, roomMap, entityReferenceMap, deviceMap),
        enabled,
        state: entity.state,
        status,
        lastTriggered,
        lastTriggeredDate,
        isRecentlyTriggered,
        needsAttention,
        attentionReason,
        nextRunLabel: getOptionalStringAttribute(entity.attributes, NEXT_RUN_ATTRIBUTE_KEYS),
        description:
          typeof entity.attributes?.description === 'string' && entity.attributes.description.trim()
            ? entity.attributes.description
            : undefined,
        mode:
          typeof entity.attributes?.mode === 'string' && entity.attributes.mode.trim()
            ? entity.attributes.mode
            : undefined,
        currentRuns:
          typeof entity.attributes?.current === 'number' &&
          Number.isFinite(entity.attributes.current)
            ? entity.attributes.current
            : undefined,
      };
    })
    .sort((left, right) => {
      if (left.enabled !== right.enabled) {
        return left.enabled ? -1 : 1;
      }

      return left.name.localeCompare(right.name, locale, { sensitivity: 'base' });
    });
}
