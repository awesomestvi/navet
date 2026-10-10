import {
  CLIMATE_OPTION_CAPABILITIES,
  type NavetClimateControlState,
  readNavetClimateControlState,
} from '@navet/core/climate-controls';
import type { NavetCommand, NavetEntity } from '@navet/core/types';
import type { HassEntity } from 'home-assistant-js-websocket';

const OPTION_CONTROLS = {
  preset: { feature: 16, value: 'preset_mode', options: 'preset_modes' },
  fanMode: { feature: 8, value: 'fan_mode', options: 'fan_modes' },
  swingMode: { feature: 32, value: 'swing_mode', options: 'swing_modes' },
  swingHorizontalMode: {
    feature: 512,
    value: 'swing_horizontal_mode',
    options: 'swing_horizontal_modes',
  },
} as const;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function mapHomeAssistantClimateControls(
  entity: HassEntity
): NavetClimateControlState | undefined {
  if (!entity.entity_id.startsWith('climate.')) return undefined;
  const attrs = entity.attributes;
  const features =
    typeof attrs.supported_features === 'number' &&
    Number.isInteger(attrs.supported_features) &&
    attrs.supported_features >= 0
      ? attrs.supported_features
      : 0;
  const controls: NavetClimateControlState = {
    writable: entity.state !== 'unknown' && entity.state !== 'unavailable',
  };
  for (const [key, definition] of Object.entries(OPTION_CONTROLS)) {
    if (!(features & definition.feature)) continue;
    const options = attrs[definition.options];
    if (
      !Array.isArray(options) ||
      !options.length ||
      !options.every((value) => typeof value === 'string' && value.length > 0)
    )
      continue;
    const value = attrs[definition.value];
    controls[key as keyof typeof OPTION_CONTROLS] = {
      value: typeof value === 'string' ? value : null,
      options: [...options],
    };
  }
  const min = attrs.min_humidity;
  const max = attrs.max_humidity;
  const step = attrs.target_humidity_step ?? 1;
  if (
    features & 4 &&
    finite(min) &&
    finite(max) &&
    min >= 0 &&
    max <= 100 &&
    min <= max &&
    finite(step) &&
    Number.isInteger(step) &&
    step > 0
  ) {
    controls.targetHumidity = {
      min,
      max,
      step,
      value: finite(attrs.humidity) ? attrs.humidity : null,
    };
  }
  if (
    finite(attrs.current_humidity) &&
    attrs.current_humidity >= 0 &&
    attrs.current_humidity <= 100
  )
    controls.currentHumidity = attrs.current_humidity;
  return controls;
}

export function getHomeAssistantClimateControlCapabilities(
  controls: NavetClimateControlState
): NavetEntity['capabilities'] {
  const result: NavetEntity['capabilities'] = [];
  for (const [key, capability] of Object.entries(CLIMATE_OPTION_CAPABILITIES)) {
    if (controls[key as keyof typeof OPTION_CONTROLS]) result.push(capability);
  }
  if (controls.targetHumidity) result.push('climate_target_humidity');
  return result;
}

export function getHomeAssistantClimateControlCommandRoute(
  entity: NavetEntity,
  command: NavetCommand
) {
  const controls = readNavetClimateControlState(entity);
  if (!entity.externalId.startsWith('climate.') || !controls?.writable)
    throw new Error('Climate controls are unavailable or unsupported');
  if (command.type === 'set_climate_humidity') {
    const control = controls.targetHumidity;
    if (
      !control ||
      !finite(command.humidity) ||
      !Number.isInteger(command.humidity) ||
      command.humidity < control.min ||
      command.humidity > control.max
    )
      throw new Error('Humidity is outside the supported range');
    return { service: 'set_humidity', data: { humidity: command.humidity } };
  }
  const routes = {
    set_climate_preset: {
      control: controls.preset,
      service: 'set_preset_mode',
      field: 'preset_mode',
    },
    set_climate_fan_mode: { control: controls.fanMode, service: 'set_fan_mode', field: 'fan_mode' },
    set_climate_swing_mode: {
      control: controls.swingMode,
      service: 'set_swing_mode',
      field: 'swing_mode',
    },
    set_climate_swing_horizontal_mode: {
      control: controls.swingHorizontalMode,
      service: 'set_swing_horizontal_mode',
      field: 'swing_horizontal_mode',
    },
  };
  if (!(command.type in routes)) throw new Error('Unsupported climate control command');
  const route = routes[command.type as keyof typeof routes];
  const value =
    command.type === 'set_climate_preset'
      ? command.preset
      : 'mode' in command
        ? command.mode
        : undefined;
  if (!route.control || typeof value !== 'string' || !route.control.options.includes(value))
    throw new Error('Climate option is not supported');
  return { service: route.service, data: { [route.field]: value } };
}
