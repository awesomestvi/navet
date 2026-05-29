import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';

export interface PlatformBatterySensorRow {
  id: string;
  name: string;
  level: number;
}

export type HaBatterySensorRow = PlatformBatterySensorRow;

type BatteryEntitySnapshot = {
  entityId?: string;
  state: string;
  attributes?: Record<string, unknown>;
};

export function mapBatterySensorRowsFromEntities(
  entities: Record<string, BatteryEntitySnapshot> | null
): PlatformBatterySensorRow[] {
  if (!entities) {
    return [];
  }

  const rows: PlatformBatterySensorRow[] = [];
  for (const [id, entity] of Object.entries(entities)) {
    if (!id.startsWith('sensor.')) {
      continue;
    }

    const attributes = entity.attributes as Record<string, unknown>;
    if (attributes.device_class !== 'battery') {
      continue;
    }

    const n = Number(entity.state);
    if (Number.isNaN(n)) {
      continue;
    }

    rows.push({
      id,
      name: (attributes.friendly_name as string) || id.replace(/^sensor\./, '').replace(/_/g, ' '),
      level: Math.min(100, Math.max(0, Math.round(n))),
    });
  }

  rows.sort((a, b) => a.level - b.level);
  return rows;
}

export function selectBatterySensorRowsFromHa(
  state: Pick<HomeAssistantStore, 'entities'>
): PlatformBatterySensorRow[] {
  return mapBatterySensorRowsFromEntities(state.entities);
}

export function haBatterySensorRowsEqual(
  a: PlatformBatterySensorRow[],
  b: PlatformBatterySensorRow[]
): boolean {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].level !== b[i].level || a[i].name !== b[i].name) {
      return false;
    }
  }

  return true;
}
