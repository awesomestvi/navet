import { describe, expect, it } from 'vitest';
import {
  createDashboardEntityView,
  indexDashboardEntityViewsByCanonicalId,
} from '../dashboard-entity-view';
import type { NavetEntity } from '../types';

function createEntity(overrides: Partial<NavetEntity> = {}): NavetEntity {
  return {
    id: 'home_assistant:light.kitchen',
    canonicalId: 'home_assistant:light.kitchen',
    providerId: 'home_assistant',
    externalId: 'light.kitchen',
    type: 'light',
    name: 'Kitchen Light',
    room: 'Kitchen',
    primaryState: 'on',
    availability: 'available',
    attributes: {},
    capabilities: ['toggle', 'brightness'],
    resources: undefined,
    lastUpdated: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('dashboard-entity-view', () => {
  it('creates a provider-neutral dashboard projection from a NavetEntity', () => {
    const entity = createEntity({
      attributes: {
        size: 'large',
        brightness: 87,
      },
    });

    expect(createDashboardEntityView(entity)).toEqual({
      id: entity.id,
      canonicalId: entity.canonicalId,
      providerId: 'home_assistant',
      externalId: 'light.kitchen',
      type: 'light',
      name: 'Kitchen Light',
      room: 'Kitchen',
      primaryState: 'on',
      availability: 'available',
      capabilities: ['toggle', 'brightness'],
      attributes: {
        size: 'large',
        brightness: 87,
      },
      resources: undefined,
      size: 'large',
      lastUpdated: '2024-01-01T00:00:00.000Z',
    });
  });

  it('falls back to a safe default size when no card size metadata exists', () => {
    const entity = createEntity({
      attributes: {
        brightness: 42,
      },
    });

    expect(createDashboardEntityView(entity).size).toBe('small');
  });

  it('indexes entity views by canonical id for shared dashboard consumers', () => {
    const entity = createEntity();

    expect(indexDashboardEntityViewsByCanonicalId([entity])).toEqual({
      'home_assistant:light.kitchen': expect.objectContaining({
        canonicalId: 'home_assistant:light.kitchen',
        externalId: 'light.kitchen',
      }),
    });
  });
});
