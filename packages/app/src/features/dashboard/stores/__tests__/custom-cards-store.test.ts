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

  it('clamps oversized button cards to small', () => {
    expect(
      normalizeCustomCard(
        buildCard({
          id: 'custom-button',
          type: 'button',
          size: 'medium',
        })
      ).size
    ).toBe('small');
  });

  it('normalizes persisted media stack card data', () => {
    expect(
      normalizeCustomCard(
        buildCard({
          id: 'custom-media-stack',
          type: 'media-stack',
          data: {
            entityIds: ['media_player.tv', 12, 'media_player.speaker'],
            priorityOrder: ['media_player.speaker', 'missing', 'media_player.tv'],
          },
        })
      ).data
    ).toEqual({
      entityIds: ['media_player.tv', 'media_player.speaker'],
      priorityOrder: ['media_player.speaker', 'media_player.tv'],
      idleBehavior: 'compact',
    });
  });

  it('allows single-sensor info cards to keep medium', () => {
    expect(
      normalizeCustomCard(
        buildCard({
          size: 'medium',
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature'],
          },
        })
      ).size
    ).toBe('medium');
  });

  it('keeps grouped info cards eligible for medium and large', () => {
    expect(
      normalizeCustomCard(
        buildCard({
          size: 'medium',
          data: {
            sensorEntityIds: ['sensor.kitchen_temperature', 'sensor.kitchen_humidity'],
          },
        })
      ).size
    ).toBe('medium');
  });

  it('clamps oversized button cards when added and updated through the store', () => {
    const addedCard = useCustomCardsStore.getState().addCard('button', 'large', 'Kitchen');

    expect(addedCard.size).toBe('small');
    expect(useCustomCardsStore.getState().cards).toEqual([
      expect.objectContaining({
        id: addedCard.id,
        type: 'button',
        size: 'small',
      }),
    ]);

    useCustomCardsStore.getState().updateCard(addedCard.id, { size: 'extra-large' });

    expect(useCustomCardsStore.getState().cards).toEqual([
      expect.objectContaining({
        id: addedCard.id,
        type: 'button',
        size: 'small',
      }),
    ]);
  });

  it('preserves single-sensor info card sizes when added, updated, and rehydrated through the store', async () => {
    const addedCard = useCustomCardsStore.getState().addCard('info', 'medium', 'Kitchen', {
      sensorEntityIds: ['sensor.kitchen_temperature'],
    });

    expect(addedCard.size).toBe('medium');

    useCustomCardsStore.getState().updateCard(addedCard.id, {
      size: 'medium',
    });

    expect(useCustomCardsStore.getState().cards).toEqual([
      expect.objectContaining({
        id: addedCard.id,
        type: 'info',
        size: 'medium',
      }),
    ]);

    localStorage.setItem(
      STORE_STORAGE_KEYS.customCards,
      JSON.stringify({
        state: {
          cards: [
            buildCard({
              id: 'persisted-single-info',
              size: 'large',
              data: {
                sensorEntityIds: ['sensor.kitchen_temperature'],
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
        id: 'persisted-single-info',
        type: 'info',
        size: 'large',
      }),
    ]);
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
        type: 'info',
      }),
    ]);
    expect(localStorage.getItem(STORE_STORAGE_KEYS.customCards)).toContain('"legacy-info"');
    expect(localStorage.getItem(LEGACY_STORE_STORAGE_KEYS.customCards)).toBeNull();
  });

  it('normalizes persisted button cards to small during rehydration', async () => {
    localStorage.setItem(
      STORE_STORAGE_KEYS.customCards,
      JSON.stringify({
        state: {
          cards: [
            buildCard({
              id: 'persisted-button',
              type: 'button',
              size: 'medium',
            }),
          ],
        },
        version: 0,
      })
    );

    await useCustomCardsStore.persist.rehydrate();

    expect(useCustomCardsStore.getState().cards).toEqual([
      expect.objectContaining({
        id: 'persisted-button',
        type: 'button',
        size: 'small',
      }),
    ]);
  });
});
