import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useProviderMediaCompanionEntity,
  useProviderMediaEntityRegistry,
  useProviderMediaPlaybackData,
  useProviderMediaPlayerEntities,
} from './use-provider-media-playback-data';

const currentProviderId = 'home_assistant';
let mediaPlayerEntityIds = ['media_player.kitchen', 'media_player.living_room'];
let mediaPlayerSnapshots = {
  'media_player.kitchen': {
    entityId: 'media_player.kitchen',
    state: 'idle',
    attributes: { friendly_name: 'Kitchen Speaker' },
  },
  'media_player.living_room': {
    entityId: 'media_player.living_room',
    state: 'playing',
    attributes: { friendly_name: 'Living Room Speaker' },
  },
} as Record<string, { entityId: string; state: string; attributes?: Record<string, unknown> }>;
let remoteSnapshot = {
  entityId: 'remote.kitchen',
  state: 'on',
  attributes: { friendly_name: 'Kitchen Remote' },
} as { entityId: string; state: string; attributes?: Record<string, unknown> } | undefined;
const mediaRegistry = [
  {
    entityId: 'media_player.kitchen',
    deviceId: 'device-kitchen',
    areaId: 'kitchen',
    name: 'Kitchen Speaker',
    platform: 'cast',
  },
  {
    entityId: 'media_player.living_room',
    deviceId: 'device-living-room',
    areaId: 'living-room',
    name: 'Living Room Speaker',
    platform: 'cast',
  },
];

vi.mock('@navet/app/hooks/use-integration-store', () => ({
  useIntegrationStore: (selector: (state: { currentProviderId: string }) => unknown) =>
    selector({ currentProviderId }),
}));

vi.mock('@navet/app/hooks/use-provider-device', () => ({
  useProviderEntityModel: () => undefined,
}));

vi.mock('@navet/app/hooks/use-provider-entity', () => ({
  useProviderEntityIdsByPrefix: (_prefixes: string[], options?: { enabled?: boolean }) =>
    options?.enabled === false ? [] : mediaPlayerEntityIds,
  useProviderEntityRegistryEntriesByIds: (_ids: string[], options?: { enabled?: boolean }) =>
    options?.enabled === false ? [] : mediaRegistry,
  useProviderEntitySnapshot: (entityId: string) =>
    entityId === 'home_assistant:remote.kitchen' ? remoteSnapshot : undefined,
  useProviderEntitySnapshotRecord: (_ids: string[], options?: { enabled?: boolean }) =>
    options?.enabled === false ? {} : mediaPlayerSnapshots,
}));

describe('useProviderMediaPlaybackData', () => {
  beforeEach(() => {
    mediaPlayerEntityIds = ['media_player.kitchen', 'media_player.living_room'];
    mediaPlayerSnapshots = {
      'media_player.kitchen': {
        entityId: 'media_player.kitchen',
        state: 'idle',
        attributes: { friendly_name: 'Kitchen Speaker' },
      },
      'media_player.living_room': {
        entityId: 'media_player.living_room',
        state: 'playing',
        attributes: { friendly_name: 'Living Room Speaker' },
      },
    };
    remoteSnapshot = {
      entityId: 'remote.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Remote' },
    };
  });

  it('returns narrowed media player entities and registry entries', () => {
    const { result } = renderHook(() => useProviderMediaPlaybackData('media_player.kitchen'));

    expect(result.current.entities).toEqual(mediaPlayerSnapshots);
    expect(result.current.entityRegistry).toEqual(mediaRegistry);
  });

  it('resolves a companion entity from the same provider namespace', () => {
    const { result } = renderHook(() =>
      useProviderMediaCompanionEntity('home_assistant:media_player.kitchen', 'remote')
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        entityId: 'remote.kitchen',
      })
    );
  });

  it('returns only media player registry entries and snapshots when enabled', () => {
    const { result: registryResult } = renderHook(() =>
      useProviderMediaEntityRegistry('media_player.kitchen')
    );
    const { result: playerEntitiesResult } = renderHook(() =>
      useProviderMediaPlayerEntities('media_player.kitchen', true)
    );

    expect(registryResult.current).toEqual(mediaRegistry);
    expect(playerEntitiesResult.current).toEqual(mediaPlayerSnapshots);
  });
});
