import { describe, expect, it } from 'vitest';
import type { RoomWorkspaceV2 } from '../../rooms';
import { resolveDashboardRoomPreferences } from '../dashboard-room-preferences';

const workspace: RoomWorkspaceV2 = {
  version: 2,
  groups: [
    {
      id: 'group_upstairs' as RoomWorkspaceV2['groups'][number]['id'],
      displayName: 'Upstairs',
      order: 0,
    },
  ],
  reviewIssues: [],
  rooms: [
    {
      id: 'room_kitchen' as RoomWorkspaceV2['rooms'][number]['id'],
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
        order: 1,
        visibility: 'visible',
      },
    },
    {
      id: 'room_bedroom' as RoomWorkspaceV2['rooms'][number]['id'],
      displayName: 'Bedroom',
      origin: 'provider',
      sourceRefs: [
        {
          providerId: 'home_assistant',
          canonicalId: 'home_assistant:area_bedroom',
          sourceType: 'provider_managed',
        },
      ],
      metadata: {
        groupId: 'group_upstairs' as RoomWorkspaceV2['groups'][number]['id'],
        order: 0,
        visibility: 'hidden',
      },
    },
    {
      id: 'room_studio' as RoomWorkspaceV2['rooms'][number]['id'],
      displayName: 'Studio',
      origin: 'navet',
      sourceRefs: [],
      metadata: {
        favoriteRank: 0,
        order: 2,
        visibility: 'visible',
      },
    },
  ],
};

describe('resolveDashboardRoomPreferences', () => {
  it('keeps the legacy name preferences as the fallback before V2 is initialized', () => {
    expect(
      resolveDashboardRoomPreferences({
        availableRooms: ['Kitchen', 'Bedroom', 'Patio'],
        hiddenRoomNames: ['Bedroom', 'Disconnected'],
        roomOrder: ['Bedroom', 'Kitchen', 'Disconnected'],
        workspace: null,
      })
    ).toEqual({
      rooms: ['Bedroom', 'Kitchen', 'Patio'],
      hiddenRoomNames: ['Bedroom', 'Disconnected'],
    });
  });

  it('surfaces favorites first and applies V2 order and visibility', () => {
    expect(
      resolveDashboardRoomPreferences({
        availableRooms: ['Kitchen', 'Bedroom', 'Patio'],
        hiddenRoomNames: ['Kitchen'],
        roomOrder: ['Kitchen', 'Bedroom'],
        workspace,
      })
    ).toEqual({
      rooms: ['Studio', 'Bedroom', 'Kitchen', 'Patio'],
      hiddenRoomNames: ['Bedroom'],
    });
  });

  it('keeps name navigation unambiguous when workspace and provider names overlap', () => {
    expect(
      resolveDashboardRoomPreferences({
        availableRooms: ['kitchen', 'Patio'],
        hiddenRoomNames: [],
        roomOrder: [],
        workspace,
      }).rooms
    ).toEqual(['Studio', 'Bedroom', 'Kitchen', 'Patio']);
  });
});
