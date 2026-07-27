import { describe, expect, it } from 'vitest';
import {
  assignRoomWorkspaceGroupV2,
  buildRoomWorkspaceIndexV2,
  createNavetRoomWorkspaceRoomV2,
  createRoomWorkspaceGroupV2,
  deleteNavetRoomWorkspaceRoomV2,
  deleteRoomWorkspaceGroupV2,
  getRoomWorkspaceDisplayNameById,
  getRoomWorkspaceRoomIdBySourceCanonicalId,
  getRoomWorkspaceRoomsInDisplayOrderV2,
  linkRoomWorkspaceSourceV2,
  migrateLegacyRoomWorkspaceV2,
  parseRoomWorkspaceV2,
  type RoomWorkspaceDiscoveredRoom,
  type RoomWorkspaceGroupId,
  type RoomWorkspaceIdFactory,
  type RoomWorkspaceRoomId,
  type RoomWorkspaceSourceRefV2,
  reconcileRoomWorkspaceV2,
  renameRoomWorkspaceGroupV2,
  renameRoomWorkspaceRoomV2,
  reorderRoomWorkspaceGroupsV2,
  reorderRoomWorkspaceRoomsV2,
  setRoomWorkspaceFavoriteRankV2,
  setRoomWorkspaceGroupSymbolV2,
  setRoomWorkspaceRoomImageV2,
  setRoomWorkspaceRoomSymbolV2,
  setRoomWorkspaceVisibilityV2,
  unlinkRoomWorkspaceSourceV2,
} from '.';

function createDeterministicIdFactory(): RoomWorkspaceIdFactory {
  let sequence = 0;
  return (scope) => {
    sequence += 1;
    return `${scope}_test_${String(sequence).padStart(4, '0')}` as
      | RoomWorkspaceRoomId
      | RoomWorkspaceGroupId;
  };
}

function sourceRef(
  providerId: RoomWorkspaceSourceRefV2['providerId'],
  nativeId: string,
  sourceType: RoomWorkspaceSourceRefV2['sourceType'] = 'provider_managed'
): RoomWorkspaceSourceRefV2 {
  return {
    providerId,
    canonicalId: `${providerId}:${nativeId}`,
    sourceType,
  };
}

function discoveredRoom(
  displayName: string,
  providerId: RoomWorkspaceSourceRefV2['providerId'],
  nativeId: string
): RoomWorkspaceDiscoveredRoom {
  return {
    displayName,
    sourceRef: sourceRef(providerId, nativeId),
  };
}

describe('room workspace V2 identity and migration', () => {
  it('keeps equal display names as separate source-backed rooms with opaque IDs', () => {
    const workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [
        discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen'),
        discoveredRoom('Kitchen', 'homey', 'zone_kitchen'),
      ],
      idFactory: createDeterministicIdFactory(),
    });

    expect(workspace.rooms).toHaveLength(2);
    expect(workspace.rooms.map((room) => room.id)).toEqual(['room_test_0001', 'room_test_0002']);
    expect(workspace.rooms.every((room) => room.id !== room.displayName)).toBe(true);

    const index = buildRoomWorkspaceIndexV2(workspace);
    expect(getRoomWorkspaceRoomIdBySourceCanonicalId(index, 'home_assistant:area_kitchen')).toBe(
      'room_test_0001'
    );
    expect(getRoomWorkspaceRoomIdBySourceCanonicalId(index, 'homey:zone_kitchen')).toBe(
      'room_test_0002'
    );
  });

  it('migrates unique legacy order, visibility, grouping, and symbols', () => {
    const workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [
        discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen'),
        discoveredRoom('Bedroom', 'home_assistant', 'area_bedroom'),
      ],
      roomOrder: ['Bedroom', 'Kitchen'],
      hiddenRoomNames: ['Kitchen'],
      roomOrganization: {
        groups: [{ id: 'upstairs', name: 'Upstairs', symbol: '🙂' }],
        groupIdByRoomKey: {
          bedroom: 'upstairs',
        },
      },
      idFactory: createDeterministicIdFactory(),
    });

    expect(workspace.groups).toEqual([
      {
        id: 'group_test_0003',
        displayName: 'Upstairs',
        order: 0,
        symbol: '🙂',
      },
    ]);
    expect(workspace.rooms.map((room) => room.displayName)).toEqual(['Bedroom', 'Kitchen']);
    expect(workspace.rooms[0]?.metadata.groupId).toBe('group_test_0003');
    expect(workspace.rooms[1]?.metadata.visibility).toBe('hidden');
    expect(workspace.reviewIssues).toEqual([]);
  });

  it('preserves ambiguous legacy preferences on a review placeholder instead of merging providers', () => {
    const workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [
        discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen'),
        discoveredRoom('Kitchen', 'homey', 'zone_kitchen'),
      ],
      roomOrder: ['Kitchen'],
      hiddenRoomNames: ['Kitchen'],
      roomOrganization: {
        groups: [{ id: 'downstairs', name: 'Downstairs', symbol: 'House' }],
        groupIdByRoomKey: { kitchen: 'downstairs' },
      },
      idFactory: createDeterministicIdFactory(),
    });

    const providerRooms = workspace.rooms.filter((room) => room.origin === 'provider');
    const placeholder = workspace.rooms.find((room) => room.origin === 'legacy');

    expect(providerRooms).toHaveLength(2);
    expect(providerRooms.every((room) => room.metadata.visibility === 'visible')).toBe(true);
    expect(providerRooms.every((room) => room.metadata.groupId === undefined)).toBe(true);
    expect(placeholder).toMatchObject({
      displayName: 'Kitchen',
      sourceRefs: [],
      metadata: {
        order: 0,
        visibility: 'hidden',
        groupId: 'group_test_0003',
      },
    });
    expect(workspace.reviewIssues).toEqual([
      {
        code: 'ambiguous_legacy_name',
        legacyName: 'Kitchen',
        affectedFields: ['order', 'visibility', 'group'],
        candidateRoomIds: ['room_test_0001', 'room_test_0002'],
        placeholderRoomId: 'room_test_0004',
      },
    ]);
  });

  it('does not confuse the All target with a real provider room named All', () => {
    const workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [discoveredRoom('All', 'home_assistant', 'area_all')],
      roomOrder: ['All'],
      hiddenRoomNames: ['All'],
      idFactory: createDeterministicIdFactory(),
    });

    const providerRoom = workspace.rooms.find((room) => room.origin === 'provider');
    const placeholder = workspace.rooms.find((room) => room.origin === 'legacy');

    expect(providerRoom?.metadata.visibility).toBe('visible');
    expect(placeholder?.metadata.visibility).toBe('hidden');
    expect(workspace.reviewIssues[0]).toMatchObject({
      code: 'legacy_all_collision',
      candidateRoomIds: [providerRoom?.id],
      placeholderRoomId: placeholder?.id,
    });
  });

  it('keeps an unmatched legacy room as an explicit placeholder', () => {
    const workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [],
      roomOrder: ['Disconnected room'],
      hiddenRoomNames: ['Disconnected room'],
      idFactory: createDeterministicIdFactory(),
    });

    expect(workspace.rooms[0]).toMatchObject({
      id: 'room_test_0001',
      displayName: 'Disconnected room',
      origin: 'legacy',
      sourceRefs: [],
      metadata: { visibility: 'hidden' },
    });
    expect(workspace.reviewIssues[0]).toMatchObject({
      code: 'unmatched_legacy_name',
      placeholderRoomId: 'room_test_0001',
    });
  });

  it('preserves a room ID when its provider display name changes', () => {
    const initial = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen')],
      idFactory: createDeterministicIdFactory(),
    });

    const reconciled = reconcileRoomWorkspaceV2(
      initial,
      [
        discoveredRoom('Galley', 'home_assistant', 'area_kitchen'),
        discoveredRoom('Galley', 'homey', 'zone_galley'),
      ],
      { idFactory: createDeterministicIdFactory() }
    );

    expect(reconciled.rooms[0]).toMatchObject({
      id: initial.rooms[0]?.id,
      displayName: 'Galley',
    });
    expect(reconciled.rooms[1]?.id).not.toBe(initial.rooms[0]?.id);
  });

  it('preserves an explicit Navet room name when provider discovery changes', () => {
    const initial = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen')],
      idFactory: createDeterministicIdFactory(),
    });
    const roomId = initial.rooms[0]?.id as RoomWorkspaceRoomId;
    const renamed = renameRoomWorkspaceRoomV2(initial, roomId, 'Cooking');

    const reconciled = reconcileRoomWorkspaceV2(
      renamed,
      [discoveredRoom('Galley', 'home_assistant', 'area_kitchen')],
      { idFactory: createDeterministicIdFactory() }
    );

    expect(reconciled.rooms[0]).toMatchObject({
      id: roomId,
      displayName: 'Cooking',
      metadata: { nameMode: 'custom' },
    });
  });

  it('sanitizes imported references and records duplicate source ownership', () => {
    const parsed = parseRoomWorkspaceV2({
      version: 2,
      groups: [],
      rooms: [
        {
          id: 'room_first_0001',
          displayName: 'First',
          origin: 'provider',
          sourceRefs: [sourceRef('home_assistant', 'area_shared')],
          metadata: {
            order: 0,
            visibility: 'visible',
            image: { kind: 'url', value: 'javascript:alert(1)' },
          },
        },
        {
          id: 'room_second_0002',
          displayName: 'Second',
          origin: 'provider',
          sourceRefs: [
            sourceRef('home_assistant', 'area_shared'),
            {
              providerId: 'homey',
              canonicalId: 'home_assistant:wrong_scope',
              sourceType: 'provider_managed',
            },
          ],
          metadata: { order: 1, visibility: 'visible' },
        },
      ],
      reviewIssues: [],
    });

    expect(parsed?.rooms[0]?.metadata.image).toBeUndefined();
    expect(parsed?.rooms[1]?.sourceRefs).toEqual([]);
    expect(parsed?.reviewIssues).toEqual([
      {
        code: 'duplicate_source_ref',
        affectedFields: [],
        candidateRoomIds: ['room_first_0001', 'room_second_0002'],
        sourceCanonicalId: 'home_assistant:area_shared',
      },
    ]);
  });
});

describe('room workspace V2 selectors and immutable operations', () => {
  it('indexes source and display lookups and sorts grouped rooms without repeated scans', () => {
    const idFactory = createDeterministicIdFactory();
    let workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [
        discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen'),
        discoveredRoom('Bedroom', 'home_assistant', 'area_bedroom'),
      ],
      idFactory,
    });
    const createdGroup = createRoomWorkspaceGroupV2(
      workspace,
      { displayName: 'Upstairs' },
      idFactory
    );
    workspace = createdGroup.workspace;
    workspace = assignRoomWorkspaceGroupV2(
      workspace,
      workspace.rooms[1]?.id as RoomWorkspaceRoomId,
      createdGroup.groupId
    );
    workspace = reorderRoomWorkspaceRoomsV2(workspace, [
      workspace.rooms[1]?.id as RoomWorkspaceRoomId,
    ]);

    const index = buildRoomWorkspaceIndexV2(workspace);
    const kitchenId = getRoomWorkspaceRoomIdBySourceCanonicalId(
      index,
      'home_assistant:area_kitchen'
    );

    expect(kitchenId).toBeDefined();
    expect(getRoomWorkspaceDisplayNameById(index, kitchenId as RoomWorkspaceRoomId)).toBe(
      'Kitchen'
    );
    expect(
      getRoomWorkspaceRoomsInDisplayOrderV2(workspace).map((room) => room.displayName)
    ).toEqual(['Bedroom', 'Kitchen']);
  });

  it('supports the complete local controller action set without provider mutation', () => {
    const idFactory = createDeterministicIdFactory();
    const createdRoom = createNavetRoomWorkspaceRoomV2(
      { version: 2, rooms: [], groups: [], reviewIssues: [] },
      {
        displayName: 'Studio',
        symbol: '🎨',
        image: { kind: 'asset', value: 'wallpaper/studio' },
      },
      idFactory
    );
    const roomId = createdRoom.roomId as RoomWorkspaceRoomId;
    const createdGroup = createRoomWorkspaceGroupV2(
      createdRoom.workspace,
      { displayName: 'Creative', symbol: 'Palette' },
      idFactory
    );
    const groupId = createdGroup.groupId as RoomWorkspaceGroupId;

    let workspace = renameRoomWorkspaceRoomV2(createdGroup.workspace, roomId, 'Art studio');
    workspace = renameRoomWorkspaceGroupV2(workspace, groupId, 'Work');
    workspace = setRoomWorkspaceVisibilityV2(workspace, roomId, 'hidden');
    workspace = setRoomWorkspaceFavoriteRankV2(workspace, roomId, 0);
    workspace = setRoomWorkspaceRoomSymbolV2(workspace, roomId, '🖌️');
    workspace = setRoomWorkspaceRoomImageV2(workspace, roomId, {
      kind: 'url',
      value: 'https://example.com/studio.jpg',
    });
    workspace = setRoomWorkspaceGroupSymbolV2(workspace, groupId, 'Briefcase');
    workspace = assignRoomWorkspaceGroupV2(workspace, roomId, groupId);
    workspace = linkRoomWorkspaceSourceV2(
      workspace,
      roomId,
      sourceRef('home_assistant', 'area_studio')
    );
    workspace = unlinkRoomWorkspaceSourceV2(workspace, roomId, 'home_assistant:area_studio');
    workspace = reorderRoomWorkspaceRoomsV2(workspace, [roomId]);
    workspace = reorderRoomWorkspaceGroupsV2(workspace, [groupId]);

    expect(workspace.rooms[0]).toMatchObject({
      displayName: 'Art studio',
      origin: 'navet',
      sourceRefs: [],
      metadata: {
        visibility: 'hidden',
        favoriteRank: 0,
        symbol: '🖌️',
        image: {
          kind: 'url',
          value: 'https://example.com/studio.jpg',
        },
        groupId,
      },
    });
    expect(workspace.groups[0]).toMatchObject({
      displayName: 'Work',
      symbol: 'Briefcase',
    });

    workspace = deleteRoomWorkspaceGroupV2(workspace, groupId);
    expect(workspace.rooms[0]?.metadata.groupId).toBeUndefined();
    workspace = deleteNavetRoomWorkspaceRoomV2(workspace, roomId);
    expect(workspace.rooms).toEqual([]);
  });

  it('does not locally delete provider-backed rooms', () => {
    const workspace = migrateLegacyRoomWorkspaceV2({
      discoveredRooms: [discoveredRoom('Kitchen', 'home_assistant', 'area_kitchen')],
      idFactory: createDeterministicIdFactory(),
    });

    expect(
      deleteNavetRoomWorkspaceRoomV2(workspace, workspace.rooms[0]?.id as RoomWorkspaceRoomId)
    ).toEqual(workspace);
  });
});
