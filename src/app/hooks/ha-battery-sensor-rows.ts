import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';

export interface HaBatterySensorRow {
  id: string;
  name: string;
  level: number;
}

/** Narrow HA subscription: battery-class `sensor.*` rows only (sorted by level). */
export function selectBatterySensorRowsFromHa(state: HomeAssistantStore): HaBatterySensorRow[] {
  const entities = state.entities;
  if (!entities) {
    return [];
  }

  const rows: HaBatterySensorRow[] = [];
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

export function haBatterySensorRowsEqual(
  a: HaBatterySensorRow[],
  b: HaBatterySensorRow[]
): boolean {
  if (a === b) {
    return true;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].level !== b[i].level || a[i].name !== b[i].name) {
      return false;
    }
  }

  return true;
}
