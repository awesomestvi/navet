import type { NavetProviderState } from '@navet/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavetProviderContract } from '@/app/internal/compat';
import { createSnapshotBackedProviderAdapter } from './snapshot-backed-adapter';

describe('createSnapshotBackedProviderAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits update events only when entity data changes semantically', async () => {
    let state: NavetProviderState = {
      providerId: 'home_assistant' as const,
      connected: true,
      entities: [
        {
          id: 'home_assistant:light.kitchen',
          canonicalId: 'home_assistant:light.kitchen',
          providerId: 'home_assistant' as const,
          externalId: 'light.kitchen',
          type: 'light',
          name: 'Kitchen Light',
          room: 'Kitchen',
          primaryState: 'on',
          availability: 'available' as const,
          capabilities: [],
          attributes: {
            brightness: 100,
          },
        },
      ],
      rooms: [],
    };

    let subscriber: (() => void) | null = null;
    const emitSubscriber = () => {
      if (typeof subscriber !== 'function') {
        throw new Error('Expected provider subscription callback to be registered');
      }

      subscriber();
    };
    const contract: NavetProviderContract = {
      providerId: 'home_assistant',
      getState: () => state,
      subscribeState: (callback) => {
        subscriber = callback;
        return () => {
          subscriber = null;
        };
      },
    };
    const adapter = createSnapshotBackedProviderAdapter({
      providerId: 'home_assistant',
      contract,
      executeCommand: vi.fn(),
    });

    const events: Array<{ type: string; entityId: string }> = [];
    await adapter.subscribeToEvents((event) => {
      if ('entityId' in event) {
        events.push({ type: event.type, entityId: event.entityId });
      }
    });

    state = {
      ...state,
      entities: state.entities.map((entity) => ({
        ...entity,
        attributes: {
          ...entity.attributes,
        },
      })),
    };
    emitSubscriber();

    state = {
      ...state,
      entities: state.entities.map((entity) => ({
        ...entity,
        primaryState: 'off',
      })),
    };
    emitSubscriber();

    expect(events).toEqual([
      {
        type: 'entity_updated',
        entityId: 'home_assistant:light.kitchen',
      },
    ]);
  });
});
