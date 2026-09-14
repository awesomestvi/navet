import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { useRoomWorkspaceStore } from '@navet/app/features/dashboard/rooms/room-workspace-store';
import { useEntityRoomOverridesStore } from '@navet/app/stores/entity-room-overrides-store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadOrMigrateRoomWorkspaceV2,
  migrateLegacyRoomWorkspaceV2,
  type RoomWorkspaceGroupId,
  type RoomWorkspaceIdFactory,
  type RoomWorkspaceRoomId,
  readRoomWorkspaceV2,
} from '.';

function createDeterministicIdFactory(): RoomWorkspaceIdFactory {
  let sequence = 0;
  return (scope) => {
    sequence += 1;
    return `${scope}_storage_${String(sequence).padStart(4, '0')}` as
      | RoomWorkspaceRoomId
      | RoomWorkspaceGroupId;
  };
}

describe('room workspace V2 storage', () => {
  beforeEach(() => {
    localStorage.clear();
    useRoomWorkspaceStore.setState({ workspace: null });
    useEntityRoomOverridesStore.getState().replaceRoomOverrides({});
  });

  it('merges common provider room names and redirects placements from saved duplicate room IDs', () => {
    const discoveredRooms = [
      {
        displayName: 'Kitchen',
        sourceRef: {
          providerId: 'home_assistant' as const,
          canonicalId: 'home_assistant:kitchen',
          sourceType: 'provider_managed' as const,
        },
      },
      {
        displayName: 'kitchen',
        sourceRef: {
          providerId: 'homey' as const,
          canonicalId: 'homey:kitchen',
          sourceType: 'provider_managed' as const,
        },
      },
    ];
    const previous = migrateLegacyRoomWorkspaceV2({
      discoveredRooms,
      idFactory: createDeterministicIdFactory(),
    });
    localStorage.setItem(STORAGE_KEYS.roomWorkspace, JSON.stringify(previous));
    useEntityRoomOverridesStore.getState().replaceRoomOverrides({
      'homey:coffee_maker': previous.rooms[1].id,
      'homey:desk_lamp': 'room_office',
    });

    const workspace = useRoomWorkspaceStore.getState().initialize(discoveredRooms);

    expect(workspace.rooms).toHaveLength(1);
    expect(workspace.rooms[0].sourceRefs).toHaveLength(2);
    expect(useEntityRoomOverridesStore.getState().roomIdsByEntityId).toEqual({
      'homey:coffee_maker': previous.rooms[0].id,
      'homey:desk_lamp': 'room_office',
    });
    expect(readRoomWorkspaceV2()).toEqual(workspace);
    expect(useRoomWorkspaceStore.getState().initialize(discoveredRooms)).toEqual(workspace);
  });

  it('applies saved legacy room preferences to the combined provider room', () => {
    localStorage.setItem(STORAGE_KEYS.roomOrder, JSON.stringify(['Kitchen']));
    localStorage.setItem(STORAGE_KEYS.hiddenRooms, JSON.stringify(['Kitchen']));
    const workspace = loadOrMigrateRoomWorkspaceV2([
      {
        displayName: 'Kitchen',
        sourceRef: {
          providerId: 'home_assistant',
          canonicalId: 'home_assistant:kitchen',
          sourceType: 'provider_managed',
        },
      },
      {
        displayName: 'KITCHEN',
        sourceRef: {
          providerId: 'homey',
          canonicalId: 'homey:kitchen',
          sourceType: 'provider_managed',
        },
      },
    ]);
    expect(workspace.rooms).toHaveLength(1);
    expect(workspace.rooms[0].metadata.visibility).toBe('hidden');
    expect(workspace.rooms[0].sourceRefs).toHaveLength(2);
    expect(workspace.reviewIssues).toEqual([]);
  });

  it('migrates legacy storage once and persists the canonical workspace', () => {
    localStorage.setItem(STORAGE_KEYS.roomOrder, JSON.stringify(['Bedroom', 'Kitchen']));
    localStorage.setItem(STORAGE_KEYS.hiddenRooms, JSON.stringify(['Kitchen']));
    localStorage.setItem(
      STORAGE_KEYS.roomOrganization,
      JSON.stringify({
        groups: [{ id: 'upstairs', name: 'Upstairs', symbol: '🙂' }],
        groupIdByRoomKey: { bedroom: 'upstairs' },
      })
    );

    const workspace = loadOrMigrateRoomWorkspaceV2(
      [
        {
          displayName: 'Kitchen',
          sourceRef: {
            providerId: 'home_assistant',
            canonicalId: 'home_assistant:area_kitchen',
            sourceType: 'provider_managed',
          },
        },
        {
          displayName: 'Bedroom',
          sourceRef: {
            providerId: 'home_assistant',
            canonicalId: 'home_assistant:area_bedroom',
            sourceType: 'provider_managed',
          },
        },
      ],
      { idFactory: createDeterministicIdFactory() }
    );

    expect(workspace.rooms.map((room) => room.displayName)).toEqual(['Bedroom', 'Kitchen']);
    expect(workspace.rooms[1]?.metadata.visibility).toBe('hidden');
    expect(workspace.groups[0]?.symbol).toBe('🙂');
    expect(readRoomWorkspaceV2()).toEqual(workspace);
  });

  it('reconciles persisted source references without rerunning changed legacy preferences', () => {
    const idFactory = createDeterministicIdFactory();
    const initial = loadOrMigrateRoomWorkspaceV2(
      [
        {
          displayName: 'Kitchen',
          sourceRef: {
            providerId: 'home_assistant',
            canonicalId: 'home_assistant:area_kitchen',
            sourceType: 'provider_managed',
          },
        },
      ],
      { idFactory }
    );
    localStorage.setItem(STORAGE_KEYS.hiddenRooms, JSON.stringify(['Kitchen']));

    const reconciled = loadOrMigrateRoomWorkspaceV2(
      [
        {
          displayName: 'Galley',
          sourceRef: {
            providerId: 'home_assistant',
            canonicalId: 'home_assistant:area_kitchen',
            sourceType: 'provider_managed',
          },
        },
      ],
      { idFactory }
    );

    expect(reconciled.rooms[0]).toMatchObject({
      id: initial.rooms[0]?.id,
      displayName: 'Galley',
      metadata: { visibility: 'visible' },
    });
  });
});
