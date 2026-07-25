import { useEntityRoomOverridesStore } from '@navet/app/stores/entity-room-overrides-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type {
  PlatformManageableRoomReference,
  PlatformRoomMutationPlan,
  PlatformRoomMutationResult,
} from '@navet/core/provider-feature-models';
import type { NavetEntity, NavetProviderRoom } from '@navet/core/types';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoomWorkspaceStore } from './room-workspace-store';
import { useRoomWorkspaceController } from './use-room-workspace-controller';

const { executeRoomMutationPlanMock } = vi.hoisted(() => ({
  executeRoomMutationPlanMock:
    vi.fn<(plan: PlatformRoomMutationPlan) => Promise<PlatformRoomMutationResult>>(),
}));

vi.mock('@navet/app/services/integration-admin.service', () => ({
  executeIntegrationRoomMutationPlan: executeRoomMutationPlanMock,
}));

function createRoom(
  providerId: NavetProviderRoom['providerId'],
  externalId: string,
  name: string,
  memberIds: string[] = []
): NavetProviderRoom {
  const canonicalId = `${providerId}:${externalId}`;
  return {
    id: canonicalId,
    canonicalId,
    providerId,
    externalId,
    name,
    normalizedName: name.toLocaleLowerCase(),
    memberIds,
  };
}

function createEntity(
  providerId: NavetEntity['providerId'],
  externalId: string,
  name: string,
  roomId?: string
): NavetEntity {
  const canonicalId = `${providerId}:${externalId}`;
  return {
    id: canonicalId,
    canonicalId,
    providerId,
    externalId,
    type: 'light',
    name,
    room: roomId?.split(':').at(-1),
    roomId,
    primaryState: false,
    availability: 'available',
    attributes: {},
    capabilities: [],
  };
}

function renderController(manageableRooms: PlatformManageableRoomReference[] = []) {
  return renderHookWithProviders(() =>
    useRoomWorkspaceController({
      isOpen: true,
      manageableRooms,
      roomHiddenItemCounts: new Map(),
      roomEntityCounts: new Map(),
    })
  );
}

function succeedPlan(plan: PlatformRoomMutationPlan): PlatformRoomMutationResult {
  return {
    providerId: plan.providerId,
    status: 'succeeded',
    successes: plan.steps.map((step) => ({
      stepId: step.stepId,
      operation: step.operation,
    })),
    failures: [],
  };
}

describe('useRoomWorkspaceController', () => {
  beforeEach(async () => {
    await resetAppStores();
    executeRoomMutationPlanMock.mockReset();
    executeRoomMutationPlanMock.mockImplementation(async (plan) => succeedPlan(plan));
  });

  it('keeps provider room identity stable while editing organization and appearance', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen');
    integrationStore.setState({
      normalizedRoomsByCanonicalId: { [kitchen.canonicalId]: kitchen },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(1));
    const roomId = result.current.draftWorkspace?.rooms[0]?.id;
    expect(roomId).toBeDefined();

    act(() => {
      result.current.actions.onAddGroup?.();
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({ kind: 'create-group' })
    );
    act(() => {
      result.current.confirmNameOperation('Downstairs');
    });

    const groupId = result.current.draftWorkspace?.groups[0]?.id;
    expect(groupId).toBeDefined();

    act(() => {
      result.current.actions.onRequestRoomRename?.(roomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({ kind: 'rename-room', roomId })
    );
    act(() => {
      result.current.confirmNameOperation('Cooking');
    });
    act(() => {
      result.current.actions.onRoomGroupChange?.(roomId as string, groupId as string);
      result.current.actions.onRoomFavoriteChange?.(roomId as string, true);
      result.current.actions.onRoomVisibilityChange?.(roomId as string, false);
    });
    act(() => {
      result.current.actions.onChooseRoomAppearance?.(roomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({ kind: 'appearance', roomId })
    );
    act(() => {
      result.current.confirmAppearance({
        symbol: '◇',
        image: { kind: 'url', value: 'https://example.com/kitchen.jpg' },
      });
    });

    const editedRoom = result.current.draftWorkspace?.rooms[0];
    expect(editedRoom).toMatchObject({
      id: roomId,
      displayName: 'Cooking',
      sourceRefs: [{ canonicalId: kitchen.canonicalId }],
      metadata: {
        groupId,
        favoriteRank: 0,
        visibility: 'hidden',
        symbol: '◇',
        image: { kind: 'url', value: 'https://example.com/kitchen.jpg' },
      },
    });
  });

  it('moves a dropped room into the target room group and preserves the dropped order', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen');
    const office = createRoom('home_assistant', 'office', 'Office');
    const bedroom = createRoom('home_assistant', 'bedroom', 'Bedroom');
    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        [kitchen.canonicalId]: kitchen,
        [office.canonicalId]: office,
        [bedroom.canonicalId]: bedroom,
      },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(3));

    act(() => {
      result.current.actions.onAddGroup?.();
    });
    act(() => {
      result.current.confirmNameOperation('Ground floor');
    });
    act(() => {
      result.current.actions.onAddGroup?.();
    });
    act(() => {
      result.current.confirmNameOperation('Upper floor');
    });

    const groundFloorId = result.current.draftWorkspace?.groups.find(
      (group) => group.displayName === 'Ground floor'
    )?.id;
    const upperFloorId = result.current.draftWorkspace?.groups.find(
      (group) => group.displayName === 'Upper floor'
    )?.id;
    const kitchenRoomId = result.current.draftWorkspace?.rooms.find(
      (room) => room.displayName === 'Kitchen'
    )?.id;
    const officeRoomId = result.current.draftWorkspace?.rooms.find(
      (room) => room.displayName === 'Office'
    )?.id;

    act(() => {
      result.current.actions.onRoomGroupChange?.(kitchenRoomId as string, groundFloorId as string);
      result.current.actions.onRoomGroupChange?.(officeRoomId as string, upperFloorId as string);
    });
    act(() => {
      result.current.actions.onDropRoom?.(kitchenRoomId as string, officeRoomId as string);
    });

    const droppedRoom = result.current.draftWorkspace?.rooms.find(
      (room) => room.id === kitchenRoomId
    );
    const orderedRoomIds = result.current.draftWorkspace?.rooms
      .slice()
      .sort((left, right) => left.metadata.order - right.metadata.order)
      .map((room) => room.id);
    expect(droppedRoom?.metadata.groupId).toBe(upperFloorId);
    expect(orderedRoomIds?.indexOf(kitchenRoomId as NonNullable<typeof kitchenRoomId>)).toBe(
      (orderedRoomIds?.indexOf(officeRoomId as NonNullable<typeof officeRoomId>) ?? -2) + 1
    );
  });

  it('reorders groups without changing their stable identities', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace).not.toBeNull());

    act(() => {
      result.current.actions.onAddGroup?.();
    });
    act(() => {
      result.current.confirmNameOperation('Ground floor');
    });
    act(() => {
      result.current.actions.onAddGroup?.();
    });
    act(() => {
      result.current.confirmNameOperation('Upper floor');
    });

    const groundFloorId = result.current.draftWorkspace?.groups.find(
      (group) => group.displayName === 'Ground floor'
    )?.id;
    const upperFloorId = result.current.draftWorkspace?.groups.find(
      (group) => group.displayName === 'Upper floor'
    )?.id;

    act(() => {
      result.current.actions.onMoveGroup?.(groundFloorId as string, 'later');
    });

    expect(
      result.current.draftWorkspace?.groups
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((group) => group.id)
    ).toEqual([upperFloorId, groundFloorId]);
  });

  it('merges provider sources without losing either provider room reference', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen');
    const cooking = createRoom('homey', 'cooking', 'Cooking');
    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        [kitchen.canonicalId]: kitchen,
        [cooking.canonicalId]: cooking,
      },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(2));
    const sourceRoom = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === cooking.canonicalId)
    );
    const targetRoom = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === kitchen.canonicalId)
    );

    act(() => {
      result.current.actions.onRequestRoomMerge?.(sourceRoom?.id as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'merge-room',
        sourceRoomId: sourceRoom?.id,
      })
    );
    act(() => {
      result.current.confirmMerge(targetRoom?.id as string);
    });

    expect(result.current.draftWorkspace?.rooms).toHaveLength(1);
    expect(result.current.draftWorkspace?.rooms[0]?.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ canonicalId: kitchen.canonicalId }),
        expect.objectContaining({ canonicalId: cooking.canonicalId }),
      ])
    );
  });

  it('creates a split room in the same group and enters device selection', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen');
    integrationStore.setState({
      normalizedRoomsByCanonicalId: { [kitchen.canonicalId]: kitchen },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(1));
    const sourceRoomId = result.current.draftWorkspace?.rooms[0]?.id;

    act(() => {
      result.current.actions.onAddGroup?.();
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({ kind: 'create-group' })
    );
    act(() => {
      result.current.confirmNameOperation('Ground floor');
    });
    const groupId = result.current.draftWorkspace?.groups[0]?.id;
    act(() => {
      result.current.actions.onRoomGroupChange?.(sourceRoomId as string, groupId as string);
    });
    act(() => {
      result.current.actions.onRequestRoomSplit?.(sourceRoomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'split-room',
        sourceRoomId,
      })
    );
    act(() => {
      result.current.confirmNameOperation('Pantry');
    });

    const splitRoom = result.current.draftWorkspace?.rooms.find(
      (room) => room.displayName === 'Pantry'
    );
    expect(splitRoom?.metadata.groupId).toBe(groupId);
    expect(result.current.viewModel).toMatchObject({
      mode: 'manage',
      stage: 'device-selection',
      selectedRoomId: splitRoom?.id,
    });
  });

  it('saves and later clears a local placement without requiring unsupported provider mutations', async () => {
    const lounge = createRoom('homey', 'lounge', 'Lounge', ['homey:lamp']);
    const lamp = createEntity('homey', 'lamp', 'Lamp', lounge.canonicalId);
    integrationStore.setState({
      normalizedRoomsByCanonicalId: { [lounge.canonicalId]: lounge },
      providerEntitiesByCanonicalId: { [lamp.canonicalId]: lamp },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(1));

    act(() => {
      result.current.actions.onAddRoom?.();
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({ kind: 'create-room' })
    );
    act(() => {
      result.current.confirmNameOperation('Reading nook');
    });
    const localRoomId = result.current.draftWorkspace?.rooms.find(
      (room) => room.displayName === 'Reading nook'
    )?.id;
    act(() => {
      result.current.actions.onDeviceSelectionChange?.(lamp.canonicalId, true);
    });
    await waitFor(() =>
      expect(result.current.viewModel.selectedDeviceIds).toContain(lamp.canonicalId)
    );
    act(() => {
      result.current.actions.onSave();
    });

    await waitFor(() => expect(result.current.saveOutcome.kind).toBe('saved'));
    expect(useEntityRoomOverridesStore.getState().roomIdsByEntityId[lamp.canonicalId]).toBe(
      localRoomId
    );
    expect(executeRoomMutationPlanMock).not.toHaveBeenCalled();

    act(() => {
      result.current.actions.onRequestRoomDeletion?.(localRoomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'delete-room',
        roomId: localRoomId,
      })
    );
    act(() => {
      result.current.confirmDelete();
    });
    await waitFor(() =>
      expect(result.current.draftWorkspace?.rooms.some((room) => room.id === localRoomId)).toBe(
        false
      )
    );
    act(() => {
      result.current.actions.onSave();
    });

    await waitFor(() => {
      expect(
        useEntityRoomOverridesStore.getState().roomIdsByEntityId[lamp.canonicalId]
      ).toBeUndefined();
    });
    expect(result.current.saveOutcome.kind).toBe('saved');
    expect(result.current.draftWorkspace?.rooms.some((room) => room.id === localRoomId)).toBe(
      false
    );
    expect(executeRoomMutationPlanMock).not.toHaveBeenCalled();
  });

  it('restores a staged device to its connected room when its unsaved local room is deleted', async () => {
    const lounge = createRoom('homey', 'lounge', 'Lounge', ['homey:lamp']);
    const lamp = createEntity('homey', 'lamp', 'Lamp', lounge.canonicalId);
    integrationStore.setState({
      normalizedRoomsByCanonicalId: { [lounge.canonicalId]: lounge },
      providerEntitiesByCanonicalId: { [lamp.canonicalId]: lamp },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(1));
    act(() => {
      result.current.actions.onAddRoom?.();
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({ kind: 'create-room' })
    );
    act(() => {
      result.current.confirmNameOperation('Reading nook');
    });
    const localRoomId = result.current.draftWorkspace?.rooms.find(
      (room) => room.displayName === 'Reading nook'
    )?.id;
    act(() => {
      result.current.actions.onDeviceSelectionChange?.(lamp.canonicalId, true);
    });
    await waitFor(() =>
      expect(result.current.viewModel.selectedDeviceIds).toContain(lamp.canonicalId)
    );

    act(() => {
      result.current.actions.onRequestRoomDeletion?.(localRoomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'delete-room',
        roomId: localRoomId,
      })
    );
    act(() => {
      result.current.confirmDelete();
    });
    act(() => {
      result.current.actions.onSave();
    });

    await waitFor(() => expect(result.current.saveOutcome.kind).toBe('saved'));
    expect(
      result.current.viewModel.devices.find((device) => device.id === lamp.canonicalId)?.roomId
    ).toBe(result.current.draftWorkspace?.rooms[0]?.id);
    expect(
      useEntityRoomOverridesStore.getState().roomIdsByEntityId[lamp.canonicalId]
    ).toBeUndefined();
    expect(executeRoomMutationPlanMock).not.toHaveBeenCalled();
  });

  it('moves devices before permanently deleting an exact manageable provider room', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen', [
      'home_assistant:light.ceiling',
    ]);
    const office = createRoom('home_assistant', 'office', 'Office');
    const light = createEntity(
      'home_assistant',
      'light.ceiling',
      'Ceiling light',
      kitchen.canonicalId
    );
    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        [kitchen.canonicalId]: kitchen,
        [office.canonicalId]: office,
      },
      providerEntitiesByCanonicalId: { [light.canonicalId]: light },
    });

    const manageableRooms: PlatformManageableRoomReference[] = [
      {
        id: kitchen.canonicalId,
        name: kitchen.name,
        providerId: 'home_assistant',
        canAssign: true,
        canDelete: true,
        canOrder: false,
      },
      {
        id: office.canonicalId,
        name: office.name,
        providerId: 'home_assistant',
        canAssign: true,
        canDelete: true,
        canOrder: false,
      },
    ];
    const { result } = renderController(manageableRooms);
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(2));
    const kitchenRoomId = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === kitchen.canonicalId)
    )?.id;
    const officeRoomId = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === office.canonicalId)
    )?.id;
    expect(
      result.current.viewModel.rooms.find((room) => room.id === kitchenRoomId)?.canDelete
    ).toBe(true);
    act(() => {
      result.current.actions.onDeviceQueryChange('no matching device');
    });
    expect(result.current.viewModel.devices).toHaveLength(0);
    expect(result.current.roomDeviceCounts.get(kitchenRoomId as string)).toBe(1);

    act(() => {
      result.current.actions.onRequestRoomDeletion?.(kitchenRoomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'delete-room',
        roomId: kitchenRoomId,
      })
    );
    act(() => {
      result.current.confirmDelete(officeRoomId);
    });
    act(() => {
      result.current.actions.onSave();
    });

    await waitFor(() => expect(result.current.saveOutcome.kind).toBe('saved'));
    const plan = executeRoomMutationPlanMock.mock.calls[0]?.[0];
    const assignment = plan?.steps.find((step) => step.operation === 'assign');
    const deletion = plan?.steps.find((step) => step.operation === 'delete');
    expect(assignment).toMatchObject({
      operation: 'assign',
      entityId: light.canonicalId,
      roomId: office.canonicalId,
    });
    expect(deletion).toMatchObject({
      operation: 'delete',
      roomId: kitchen.canonicalId,
      dependsOn: [assignment?.stepId],
    });
  });

  it('does not grant deletion from a different manageable room record', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen');
    const office = createRoom('home_assistant', 'office', 'Office');
    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        [kitchen.canonicalId]: kitchen,
        [office.canonicalId]: office,
      },
    });

    const { result } = renderController([
      {
        id: office.canonicalId,
        name: office.name,
        providerId: 'home_assistant',
        canAssign: true,
        canDelete: true,
        canOrder: false,
      },
    ]);
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(2));

    expect(
      result.current.viewModel.rooms.find(
        (room) => room.description?.includes('Home Assistant') && room.name === 'Kitchen'
      )?.canDelete
    ).toBe(false);
  });

  it('keeps Navet changes pending after a partially successful provider save', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen', [
      'home_assistant:light.ceiling',
    ]);
    const office = createRoom('home_assistant', 'office', 'Office');
    const light = createEntity(
      'home_assistant',
      'light.ceiling',
      'Ceiling light',
      kitchen.canonicalId
    );
    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        [kitchen.canonicalId]: kitchen,
        [office.canonicalId]: office,
      },
      providerEntitiesByCanonicalId: { [light.canonicalId]: light },
    });
    executeRoomMutationPlanMock.mockImplementation(async (plan) => {
      const successfulStep = plan.steps[0];
      const failedStep = plan.steps[1];
      if (!successfulStep || !failedStep) {
        throw new Error('Expected rename and placement steps');
      }
      return {
        providerId: plan.providerId,
        status: 'partially_succeeded',
        successes: [
          {
            stepId: successfulStep.stepId,
            operation: successfulStep.operation,
          },
        ],
        failures: [
          {
            stepId: failedStep.stepId,
            operation: failedStep.operation,
            reason: 'provider_rejected',
          },
        ],
      };
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(2));
    const kitchenRoomId = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === kitchen.canonicalId)
    )?.id;
    const officeRoomId = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === office.canonicalId)
    )?.id;
    act(() => {
      result.current.actions.onRequestRoomRename?.(kitchenRoomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'rename-room',
        roomId: kitchenRoomId,
      })
    );
    act(() => {
      result.current.confirmNameOperation('Kitchen & dining');
    });
    act(() => {
      result.current.actions.onSelectRoom(officeRoomId as string);
    });
    act(() => {
      result.current.actions.onDeviceSelectionChange?.(light.canonicalId, true);
    });
    await waitFor(() =>
      expect(result.current.viewModel.selectedDeviceIds).toContain(light.canonicalId)
    );
    act(() => {
      result.current.actions.onSave();
    });

    await waitFor(() => expect(result.current.saveOutcome.kind).toBe('partial'));
    expect(result.current.viewModel.hasUnsavedChanges).toBe(true);
    expect(
      useRoomWorkspaceStore.getState().workspace?.rooms.find((room) => room.id === kitchenRoomId)
        ?.displayName
    ).toBe('Kitchen');
    expect(
      result.current.draftWorkspace?.rooms.find((room) => room.id === kitchenRoomId)?.displayName
    ).toBe('Kitchen & dining');
  });

  it('plans provider-backed rename and assignment together', async () => {
    const kitchen = createRoom('home_assistant', 'kitchen', 'Kitchen', [
      'home_assistant:light.ceiling',
    ]);
    const office = createRoom('home_assistant', 'office', 'Office');
    const light = createEntity(
      'home_assistant',
      'light.ceiling',
      'Ceiling light',
      kitchen.canonicalId
    );
    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        [kitchen.canonicalId]: kitchen,
        [office.canonicalId]: office,
      },
      providerEntitiesByCanonicalId: { [light.canonicalId]: light },
    });

    const { result } = renderController();
    await waitFor(() => expect(result.current.draftWorkspace?.rooms).toHaveLength(2));
    const kitchenRoomId = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === kitchen.canonicalId)
    )?.id;
    const officeRoomId = result.current.draftWorkspace?.rooms.find((room) =>
      room.sourceRefs.some((source) => source.canonicalId === office.canonicalId)
    )?.id;

    act(() => {
      result.current.actions.onRequestRoomRename?.(kitchenRoomId as string);
    });
    await waitFor(() =>
      expect(result.current.pendingOperation).toMatchObject({
        kind: 'rename-room',
        roomId: kitchenRoomId,
      })
    );
    act(() => {
      result.current.confirmNameOperation('Kitchen & dining');
    });
    act(() => {
      result.current.actions.onSelectRoom(officeRoomId as string);
    });
    act(() => {
      result.current.actions.onDeviceSelectionChange?.(light.canonicalId, true);
    });
    await waitFor(() =>
      expect(result.current.viewModel.selectedDeviceIds).toContain(light.canonicalId)
    );
    act(() => {
      result.current.actions.onSave();
    });

    await waitFor(() => expect(result.current.saveOutcome.kind).toBe('saved'));
    expect(executeRoomMutationPlanMock).toHaveBeenCalledWith({
      providerId: 'home_assistant',
      steps: expect.arrayContaining([
        expect.objectContaining({
          operation: 'rename',
          roomId: kitchen.canonicalId,
          name: 'Kitchen & dining',
        }),
        expect.objectContaining({
          operation: 'assign',
          entityId: light.canonicalId,
          roomId: office.canonicalId,
        }),
      ]),
    });
  });
});
