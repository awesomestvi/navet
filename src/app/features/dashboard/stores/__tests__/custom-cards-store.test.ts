import { describe, expect, it } from 'vitest';
import type { CustomCard } from '../custom-cards-store';
import { normalizeCustomCard } from '../custom-cards-store';

function buildCard(overrides: Partial<CustomCard> = {}): CustomCard {
  return {
    id: 'custom-info',
    type: 'info',
    size: 'medium',
    room: 'Kitchen',
    createdAt: 1,
    ...overrides,
  };
}

describe('normalizeCustomCard', () => {
  it('maps a legacy sensor group card to the canonical info type', () => {
    expect(
      normalizeCustomCard({
        ...buildCard(),
        type: 'sensor-group' as const,
        data: {
          name: 'Kitchen sensors',
          sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
          accentColor: 'teal',
        },
      }).type
    ).toBe('info');
  });

  it('maps a legacy info entity id to a unified sensor entity ids array', () => {
    expect(
      normalizeCustomCard(
        buildCard({
          data: {
            entityId: 'sensor.kitchen_temperature',
          },
        })
      ).data
    ).toEqual({
      entityId: 'sensor.kitchen_temperature',
      sensorEntityIds: ['sensor.kitchen_temperature'],
    });
  });

  it('preserves an existing unified sensor entity ids array', () => {
    expect(
      normalizeCustomCard(
        buildCard({
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
          },
        })
      ).data
    ).toEqual({
      sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
    });
  });
});
