import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  loadOrMigrateRoomWorkspaceV2,
  type RoomWorkspaceGroupId,
  type RoomWorkspaceIdFactory,
  type RoomWorkspaceRoomId,
} from '@navet/app/features/dashboard/rooms';
import {
  exportDashboardConfig,
  importDashboardConfig,
  resetDashboardProfileState,
} from '@navet/app/utils/dashboard-config';
import { beforeEach, describe, expect, it } from 'vitest';

const baseConfig = {
  version: 3,
  app: 'navet',
  theme: {
    theme: 'dark',
    primaryColor: 'orange',
  },
  settings: {},
  navigation: {
    currentRoom: 'All',
    activeSection: 'home',
  },
};

function createDeterministicIdFactory(): RoomWorkspaceIdFactory {
  let sequence = 0;
  return (scope) => {
    sequence += 1;
    return `${scope}_config_${String(sequence).padStart(4, '0')}` as
      | RoomWorkspaceRoomId
      | RoomWorkspaceGroupId;
  };
}

describe('dashboard config room workspace V2', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sanitizes, persists, and exports the V2 workspace', () => {
    importDashboardConfig({
      ...baseConfig,
      roomWorkspace: {
        version: 2,
        rooms: [
          {
            id: 'room_config_kitchen',
            displayName: 'Kitchen',
            origin: 'provider',
            sourceRefs: [
              {
                providerId: 'home_assistant',
                canonicalId: 'home_assistant:area_kitchen',
                sourceType: 'provider_managed',
              },
            ],
            metadata: {
              order: 0,
              visibility: 'hidden',
              image: {
                kind: 'url',
                value: 'https://example.com/kitchen.jpg',
              },
            },
          },
        ],
        groups: [],
        reviewIssues: [],
      },
    });

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.roomWorkspace) ?? '{}');
    expect(persisted.rooms[0]).toMatchObject({
      id: 'room_config_kitchen',
      displayName: 'Kitchen',
      metadata: {
        visibility: 'hidden',
      },
    });
    expect(exportDashboardConfig().roomWorkspace).toEqual(persisted);
    expect(exportDashboardConfig().hiddenRoomNames).toBeUndefined();
  });

  it('retains legacy fields until discovered provider rooms can migrate them safely', () => {
    importDashboardConfig({
      ...baseConfig,
      roomOrder: ['Kitchen'],
      hiddenRoomNames: ['Kitchen'],
      roomOrganization: {
        groups: [{ id: 'downstairs', name: 'Downstairs', symbol: 'House' }],
        groupIdByRoomKey: { kitchen: 'downstairs' },
      },
    });

    expect(localStorage.getItem(STORAGE_KEYS.roomWorkspace)).toBeNull();

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
      ],
      { idFactory: createDeterministicIdFactory() }
    );

    expect(workspace.rooms[0]).toMatchObject({
      displayName: 'Kitchen',
      metadata: {
        visibility: 'hidden',
        groupId: 'group_config_0002',
      },
    });
    expect(workspace.groups[0]).toMatchObject({
      id: 'group_config_0002',
      displayName: 'Downstairs',
      symbol: 'House',
    });
  });

  it('removes V2 and legacy room workspace keys on dashboard reset', () => {
    localStorage.setItem(
      STORAGE_KEYS.roomWorkspace,
      JSON.stringify({ version: 2, rooms: [], groups: [], reviewIssues: [] })
    );
    localStorage.setItem(STORAGE_KEYS.roomOrder, JSON.stringify(['Kitchen']));
    localStorage.setItem(STORAGE_KEYS.hiddenRooms, JSON.stringify(['Kitchen']));
    localStorage.setItem(
      STORAGE_KEYS.roomOrganization,
      JSON.stringify({ groups: [], groupIdByRoomKey: {} })
    );

    resetDashboardProfileState();

    expect(localStorage.getItem(STORAGE_KEYS.roomWorkspace)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.roomOrder)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.hiddenRooms)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.roomOrganization)).toBeNull();
  });
});
