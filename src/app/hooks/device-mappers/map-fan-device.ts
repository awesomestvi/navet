import type { HassEntity } from 'home-assistant-js-websocket';
import type { FanDevice } from '@/app/types/device.types';
import { parseNumberish } from '../entity-utils';

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter((entry): entry is string => typeof entry === 'string');
  return values.length > 0 ? values : undefined;
}

function clampPercentage(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function mapFanDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): FanDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'on',
    percentage: clampPercentage(parseNumberish(entity.attributes?.percentage)),
    presetMode:
      typeof entity.attributes?.preset_mode === 'string'
        ? entity.attributes.preset_mode
        : undefined,
    presetModes: readStringList(entity.attributes?.preset_modes),
  };
}
