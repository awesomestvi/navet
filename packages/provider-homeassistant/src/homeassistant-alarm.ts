import type {
  NavetAlarmAction,
  NavetAlarmCodeFormat,
  NavetAlarmEntity,
  NavetAlarmState,
} from '@navet/core/alarm-types';
import type { NavetEntity } from '@navet/core/types';
import type { HassEntity } from 'home-assistant-js-websocket';

const HOME_ASSISTANT_ALARM_FEATURES = {
  ARM_AWAY: 1,
  ARM_HOME: 2,
  ARM_NIGHT: 4,
  TRIGGER: 8,
  ARM_CUSTOM_BYPASS: 16,
  ARM_VACATION: 32,
} as const;

export function readAlarmSupportedFeatures(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return 0;
}

export function mapHomeAssistantAlarmState(value: unknown): NavetAlarmState {
  switch (value) {
    case 'disarmed':
    case 'armed_home':
    case 'armed_away':
    case 'armed_night':
    case 'armed_vacation':
    case 'armed_custom_bypass':
    case 'arming':
    case 'pending':
    case 'disarming':
    case 'triggered':
    case 'unavailable':
    case 'unknown':
      return value;
    default:
      return 'unknown';
  }
}

export function mapHomeAssistantAlarmCodeFormat(value: unknown): NavetAlarmCodeFormat {
  switch (value) {
    case null:
    case undefined:
    case 'none':
      return 'none';
    case 'number':
      return 'number';
    case 'text':
      return 'text';
    default:
      return 'none';
  }
}

function hasAlarmFeature(supportedFeatures: number, feature: number) {
  return (supportedFeatures & feature) === feature;
}

export function getHomeAssistantAlarmSupportedActions(
  supportedFeatures: number
): NavetAlarmAction[] {
  const actions: NavetAlarmAction[] = [];

  if (hasAlarmFeature(supportedFeatures, HOME_ASSISTANT_ALARM_FEATURES.ARM_HOME)) {
    actions.push('arm_home');
  }
  if (hasAlarmFeature(supportedFeatures, HOME_ASSISTANT_ALARM_FEATURES.ARM_AWAY)) {
    actions.push('arm_away');
  }
  if (hasAlarmFeature(supportedFeatures, HOME_ASSISTANT_ALARM_FEATURES.ARM_NIGHT)) {
    actions.push('arm_night');
  }
  if (hasAlarmFeature(supportedFeatures, HOME_ASSISTANT_ALARM_FEATURES.ARM_VACATION)) {
    actions.push('arm_vacation');
  }
  if (hasAlarmFeature(supportedFeatures, HOME_ASSISTANT_ALARM_FEATURES.ARM_CUSTOM_BYPASS)) {
    actions.push('arm_custom_bypass');
  }

  actions.push('disarm');

  if (hasAlarmFeature(supportedFeatures, HOME_ASSISTANT_ALARM_FEATURES.TRIGGER)) {
    actions.push('trigger');
  }

  return actions;
}

export function mapHomeAssistantHassAlarmEntity(
  entity: HassEntity,
  options: {
    id: string;
    name: string;
    provider?: NavetAlarmEntity['provider'];
    availability?: NavetAlarmEntity['availability'];
  }
): NavetAlarmEntity {
  const supportedFeatures = readAlarmSupportedFeatures(entity.attributes?.supported_features);
  const codeFormat = mapHomeAssistantAlarmCodeFormat(entity.attributes?.code_format);

  return {
    id: options.id,
    name: options.name,
    state:
      options.availability === 'unavailable'
        ? 'unavailable'
        : mapHomeAssistantAlarmState(entity.state),
    supportedActions: getHomeAssistantAlarmSupportedActions(supportedFeatures),
    codeFormat,
    requiresCode:
      typeof entity.attributes?.code_arm_required === 'boolean'
        ? entity.attributes.code_arm_required
        : undefined,
    changedBy:
      typeof entity.attributes?.changed_by === 'string' ? entity.attributes.changed_by : undefined,
    lastChanged: entity.last_changed,
    provider: options.provider ?? 'home_assistant',
    availability: options.availability ?? 'available',
  };
}

export function readNavetAlarmEntity(
  entity: NavetEntity | null | undefined
): NavetAlarmEntity | null {
  if (!entity) {
    return null;
  }

  const hasAlarmState =
    entity.type === 'sensor' || typeof entity.attributes?.alarmState === 'string';

  if (!hasAlarmState) {
    return null;
  }

  const state = entity.attributes?.alarmState;
  if (typeof state !== 'string') {
    return null;
  }

  const supportedActions = Array.isArray(entity.attributes?.alarmSupportedActions)
    ? entity.attributes.alarmSupportedActions.filter(
        (action): action is NavetAlarmAction =>
          typeof action === 'string' &&
          [
            'arm_home',
            'arm_away',
            'arm_night',
            'arm_vacation',
            'arm_custom_bypass',
            'disarm',
            'trigger',
          ].includes(action)
      )
    : [];

  return {
    id: entity.canonicalId,
    name: entity.name,
    state: mapHomeAssistantAlarmState(state),
    supportedActions,
    codeFormat: mapHomeAssistantAlarmCodeFormat(entity.attributes?.alarmCodeFormat),
    requiresCode:
      typeof entity.attributes?.alarmRequiresCode === 'boolean'
        ? entity.attributes.alarmRequiresCode
        : undefined,
    changedBy:
      typeof entity.attributes?.alarmChangedBy === 'string'
        ? entity.attributes.alarmChangedBy
        : undefined,
    lastChanged:
      typeof entity.attributes?.alarmLastChanged === 'string'
        ? entity.attributes.alarmLastChanged
        : entity.lastUpdated,
    provider: entity.providerId,
    availability: entity.availability,
  };
}
