import { LEGACY_STORE_STORAGE_KEYS, STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CustomCard } from '../custom-cards-store';
import { normalizeCustomCard, useCustomCardsStore } from '../custom-cards-store';

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
  beforeEach(() => {
    localStorage.clear();
    useCustomCardsStore.setState(useCustomCardsStore.getInitialState(), true);
  });

  it('maps a legacy sensor group card to the canonical info type', () => {
    expect(
      normalizeCustomCard({
        ...buildCard(),
        type: 'sensor-group' as unknown as CustomCard['type'],
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

  it('migrates the legacy custom cards key to the navet namespace', async () => {
    localStorage.removeItem(STORE_STORAGE_KEYS.customCards);
    localStorage.setItem(
      LEGACY_STORE_STORAGE_KEYS.customCards,
      JSON.stringify({
        state: {
          cards: [
            buildCard({
              id: 'legacy-info',
              type: 'sensor-group' as unknown as CustomCard['type'],
              data: {
                entityId: 'sensor.kitchen_temperature',
              },
            }),
          ],
        },
        version: 0,
      })
    );

    await useCustomCardsStore.persist.rehydrate();

    expect(useCustomCardsStore.getState().cards).toEqual([
      expect.objectContaining({
        id: 'legacy-info',
        type: 'sensor-group',
      }),
    ]);
    expect(localStorage.getItem(STORE_STORAGE_KEYS.customCards)).toContain('"legacy-info"');
    expect(localStorage.getItem(LEGACY_STORE_STORAGE_KEYS.customCards)).toBeNull();
  });
});
