import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadOrMigrateRoomWorkspaceV2,
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
