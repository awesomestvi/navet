import type { NavetCapabilityId } from './capabilities';
import type { NavetEntity } from './types';

export interface NavetClimateOptionControl {
  value: string | null;
  options: string[];
}

export interface NavetClimateControlState {
  writable: boolean;
  preset?: NavetClimateOptionControl;
  fanMode?: NavetClimateOptionControl;
  swingMode?: NavetClimateOptionControl;
  swingHorizontalMode?: NavetClimateOptionControl;
  targetHumidity?: { value: number | null; min: number; max: number; step: number };
  currentHumidity?: number;
}

export const CLIMATE_OPTION_CAPABILITIES = {
  preset: 'climate_preset',
  fanMode: 'climate_fan_mode',
  swingMode: 'climate_swing_mode',
  swingHorizontalMode: 'climate_swing_horizontal_mode',
} as const satisfies Record<string, NavetCapabilityId>;

/** Reads validated provider-neutral controls and their advertised capabilities. */
export function readNavetClimateControlState(
  entity: NavetEntity | undefined
): NavetClimateControlState | undefined {
  if (!entity || (entity.type !== 'climate' && entity.type !== 'hvac')) return undefined;
  const raw = entity.attributes.climateControls;
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const result: NavetClimateControlState = {
    writable: source.writable === true && entity.availability === 'available',
  };
  for (const [key, capability] of Object.entries(CLIMATE_OPTION_CAPABILITIES)) {
    if (!entity.capabilities.includes(capability)) continue;
    const control = source[key] as Partial<NavetClimateOptionControl> | undefined;
    if (
      !control ||
      !Array.isArray(control.options) ||
      !control.options.length ||
      !control.options.every((option) => typeof option === 'string' && option.length > 0)
    )
      continue;
    result[key as keyof typeof CLIMATE_OPTION_CAPABILITIES] = {
      value: typeof control.value === 'string' ? control.value : null,
      options: [...control.options],
    };
  }
  const humidity = source.targetHumidity as
    | Partial<NonNullable<NavetClimateControlState['targetHumidity']>>
    | undefined;
  if (
    entity.capabilities.includes('climate_target_humidity') &&
    humidity &&
    typeof humidity.min === 'number' &&
    Number.isFinite(humidity.min) &&
    humidity.min >= 0 &&
    typeof humidity.max === 'number' &&
    Number.isFinite(humidity.max) &&
    humidity.max <= 100 &&
    humidity.max >= humidity.min &&
    typeof humidity.step === 'number' &&
    Number.isFinite(humidity.step) &&
    humidity.step > 0
  ) {
    result.targetHumidity = {
      min: humidity.min,
      max: humidity.max,
      step: humidity.step,
      value:
        typeof humidity.value === 'number' && Number.isFinite(humidity.value)
          ? humidity.value
          : null,
    };
  }
  if (
    typeof source.currentHumidity === 'number' &&
    Number.isFinite(source.currentHumidity) &&
    source.currentHumidity >= 0 &&
    source.currentHumidity <= 100
  )
    result.currentHumidity = source.currentHumidity;
  return result;
}
