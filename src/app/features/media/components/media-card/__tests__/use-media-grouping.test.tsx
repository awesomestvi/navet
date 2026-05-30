import type { NavetEntity } from '@navet/core/types';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformEntitySnapshotMap } from '@/app/platform/provider-feature-models';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

const { dispatchEntityCommandMock, runActionMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
}));

vi.mock('@/app/services/integration-action.service', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

import { useMediaGrouping } from '../use-media-grouping';

function createEntities(): PlatformEntitySnapshotMap {
  return {
    'media_player.kitchen': {
      entityId: 'media_player.kitchen',
      state: 'idle',
      attributes: {
        friendly_name: 'Kitchen Speaker',
      },
    },
    'media_player.living_room': {
      entityId: 'media_player.living_room',
      state: 'idle',
      attributes: {
        friendly_name: 'Living Room Speaker',
      },
    },
    'media_player.office': {
      entityId: 'media_player.office',
      state: 'idle',
      attributes: {
        friendly_name: 'Office Speaker',
      },
    },
  };
}

function createProviderEntity(
  entityId: string,
  name: string,
  supportsGrouping: boolean
): NavetEntity {
  return {
    id: `home_assistant:${entityId}`,
    canonicalId: `home_assistant:${entityId}`,
    providerId: 'home_assistant',
    externalId: entityId,
    type: 'media_player',
    name,
    room: name.replace(' Speaker', ''),
    primaryState: 'idle',
    availability: 'available',
    attributes: {
      supportsGrouping,
    },
    capabilities: ['media_playback'],
  };
}

describe('useMediaGrouping', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.clearAllMocks();
    integrationStore.setState((current) => ({
      ...current,
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...current.providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:media_player.kitchen': createProviderEntity(
            'media_player.kitchen',
            'Kitchen Speaker',
            true
          ),
          'home_assistant:media_player.living_room': createProviderEntity(
            'media_player.living_room',
            'Living Room Speaker',
            true
          ),
          'home_assistant:media_player.office': createProviderEntity(
            'media_player.office',
            'Office Speaker',
            false
          ),
        },
      },
      providerEntityLookupByProviderId: {
        ...current.providerEntityLookupByProviderId,
        home_assistant: {
          'media_player.kitchen': 'home_assistant:media_player.kitchen',
          'home_assistant:media_player.kitchen': 'home_assistant:media_player.kitchen',
          'media_player.living_room': 'home_assistant:media_player.living_room',
          'home_assistant:media_player.living_room': 'home_assistant:media_player.living_room',
          'media_player.office': 'home_assistant:media_player.office',
          'home_assistant:media_player.office': 'home_assistant:media_player.office',
        },
      },
    }));
  });

  it('exposes attachable grouping players from supported entities', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        groupMembers: [],
        runAction: runActionMock,
        t: (key) => key,
      })
    );

    expect(result.current.availableGroupingPlayers).toEqual([
      {
        id: 'media_player.living_room',
        isAttached: false,
        name: 'Living Room Speaker',
      },
    ]);
  });

  it('joins a media group through a provider-neutral command', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        groupMembers: ['media_player.den'],
        runAction: runActionMock,
        t: (key) => key,
      })
    );

    act(() => result.current.attachGroupMember('media_player.living_room'));

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      type: 'join_group',
      entityId: 'media_player.kitchen',
      members: ['media_player.den', 'media_player.living_room'],
    });
  });

  it('leaves a media group through a provider-neutral command', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        groupMembers: ['media_player.living_room'],
        runAction: runActionMock,
        t: (key) => key,
      })
    );

    act(() => result.current.detachGroupMember('media_player.living_room'));

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      type: 'leave_group',
      entityId: 'media_player.living_room',
    });
  });
});
