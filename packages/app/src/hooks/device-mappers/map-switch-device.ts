import type { TranslateFn } from '@navet/app/i18n/index';
import type { HomeAssistantEntityRegistryEntry } from '@navet/app/services/home-assistant.service';
import type { DeviceMetric, SwitchDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';
import { formatEntityType, parseNumberish } from '../entity-utils';

function getEntityCategory(
  entityEntry?: HomeAssistantEntityRegistryEntry
): 'config' | 'diagnostic' | null {
  const raw = (entityEntry as Record<string, unknown> | undefined)?.entity_category;
  return typeof raw === 'string' ? (raw as 'config' | 'diagnostic') : null;
}

export function mapSwitchDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: TranslateFn,
  entityEntry?: HomeAssistantEntityRegistryEntry,
  deviceMetrics?: DeviceMetric[]
): SwitchDevice | null {
  const entityCategory = getEntityCategory(entityEntry);
  if (entityCategory === 'config' || entityCategory === 'diagnostic') {
    return null;
  }

  const powerMetric = deviceMetrics?.find((metric) => metric.label === 'Power');
  const voltageMetric = deviceMetrics?.find((metric) => metric.label === 'Voltage');
  const energyMetric = deviceMetrics?.find((metric) => metric.label === 'Energy');

  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'on',
    entityType: formatEntityType(entity.attributes?.device_class, t('lighting.type.switch'), t),
    power:
      parseNumberish(entity.attributes?.power) ??
      parseNumberish(entity.attributes?.current_power_w) ??
      (typeof powerMetric?.value === 'number' ? powerMetric.value : undefined),
    voltage:
      parseNumberish(entity.attributes?.voltage) ??
      parseNumberish(entity.attributes?.current_voltage) ??
      (typeof voltageMetric?.value === 'number' ? voltageMetric.value : undefined),
    energy:
      parseNumberish(entity.attributes?.energy) ??
      parseNumberish(entity.attributes?.energy_today) ??
      (typeof energyMetric?.value === 'number' ? energyMetric.value : undefined),
    metrics: deviceMetrics,
  };
}
