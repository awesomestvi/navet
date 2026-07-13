import type { PlatformEntitySnapshotMap } from '@navet/app/platform/provider-feature-models';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { NavetEntity } from '@navet/core/types';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityCommandMock, runActionMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
}));

vi.mock('@navet/app/commands', () => ({
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
        entityRegistry: [
          { entityId: 'media_player.kitchen', platform: 'music_assistant' },
          {
            entityId: 'media_player.living_room',
            manufacturer: 'Sonos',
            model: 'One SL',
            platform: 'sonos',
          },
        ],
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
        subtitle: 'Sonos One SL',
      },
    ]);
    expect(result.current.currentPlayerIdentifier).toBe('Music Assistant');
  });

  it('joins a media group through a provider-neutral command', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        entityRegistry: [],
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

  it('uses entity metadata and the provider name when registry platforms are unavailable', () => {
    const entities = createEntities();
    if (entities['media_player.living_room']) {
      entities['media_player.living_room'].attributes.integration = 'sonos';
    }

    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities,
        entityRegistry: [],
        groupMembers: [],
        runAction: runActionMock,
        t: (key) => key,
      })
    );

    expect(result.current.availableGroupingPlayers[0]?.subtitle).toBe('Sonos');
    expect(result.current.currentPlayerIdentifier).toBe('Home Assistant');
  });

  it('keeps the wrapper integration alongside the physical speaker identity', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        entityRegistry: [
          {
            entityId: 'media_player.living_room',
            manufacturer: 'APPLE',
            model: 'HomePod mini',
            platform: 'music_assistant',
          },
        ],
        groupMembers: [],
        runAction: runActionMock,
        t: (key) => key,
      })
    );

    expect(result.current.availableGroupingPlayers[0]?.subtitle).toBe(
      'Apple HomePod mini · Music Assistant'
    );
  });

  it('leaves a media group through a provider-neutral command', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        entityRegistry: [],
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

  it('hands coordination to a remaining player before removing the current player', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaGrouping({
        entityId: 'media_player.kitchen',
        entities: createEntities(),
        entityRegistry: [],
        groupMembers: ['media_player.kitchen', 'media_player.living_room'],
        runAction: runActionMock,
        t: (key) => key,
      })
    );

    act(() => result.current.detachGroupMember('media_player.kitchen'));

    await act(async () => {
      await runActionMock.mock.results.at(-1)?.value;
    });

    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(1, {
      type: 'join_group',
      entityId: 'media_player.living_room',
      members: ['media_player.kitchen'],
    });
    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(2, {
      type: 'leave_group',
      entityId: 'media_player.kitchen',
    });
  });
});
