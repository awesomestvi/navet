import {
  ROOM_WORKSPACE_VERSION,
  type RoomWorkspaceRoomId,
  type RoomWorkspaceV2,
} from '@navet/app/features/dashboard/rooms';
import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { resetAppStores } from '@navet/app/test/store-reset';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useRoomNavigation } from '../use-room-navigation';

const KITCHEN_ID = 'room_kitchen1' as RoomWorkspaceRoomId;
const OFFICE_ID = 'room_office01' as RoomWorkspaceRoomId;

function createWorkspace(
  rooms: Array<{ id: RoomWorkspaceRoomId; displayName: string }>
): RoomWorkspaceV2 {
  return {
    version: ROOM_WORKSPACE_VERSION,
    groups: [],
    reviewIssues: [],
    rooms: rooms.map((room, order) => ({
      ...room,
      origin: 'navet',
      sourceRefs: [],
      metadata: {
        order,
        visibility: 'visible',
      },
    })),
  };
}

describe('useRoomNavigation', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('migrates a unique legacy name selection to its stable workspace id', async () => {
    useNavigationStore.setState({
      currentRoom: 'Kitchen',
      currentRoomId: null,
      lastExplicitRoom: 'Kitchen',
      lastExplicitRoomId: null,
    });
    const workspace = createWorkspace([
      { id: KITCHEN_ID, displayName: 'Kitchen' },
      { id: OFFICE_ID, displayName: 'Office' },
    ]);

    const { result } = renderHook(() => useRoomNavigation('All', workspace));

    expect(result.current.activeRoom).toBe('Kitchen');
    expect(result.current.activeRoomId).toBe(KITCHEN_ID);
    expect(result.current.preferredRoomId).toBe(KITCHEN_ID);
    await waitFor(() => {
      expect(useNavigationStore.getState()).toMatchObject({
        currentRoomId: KITCHEN_ID,
        lastExplicitRoomId: KITCHEN_ID,
      });
    });
  });

  it('keeps the active and preferred labels attached to their id after a rename', async () => {
    useNavigationStore.getState().setCurrentRoom('Kitchen', { roomId: KITCHEN_ID });
    const initialWorkspace = createWorkspace([{ id: KITCHEN_ID, displayName: 'Kitchen' }]);
    const { result, rerender } = renderHook(
      ({ workspace }) => useRoomNavigation('All', workspace),
      { initialProps: { workspace: initialWorkspace } }
    );

    rerender({
      workspace: createWorkspace([{ id: KITCHEN_ID, displayName: 'Cooking' }]),
    });

    expect(result.current.activeRoom).toBe('Cooking');
    expect(result.current.activeRoomId).toBe(KITCHEN_ID);
    expect(result.current.preferredRoom).toBe('Cooking');
    await waitFor(() => {
      expect(useNavigationStore.getState()).toMatchObject({
        currentRoom: 'Cooking',
        currentRoomId: KITCHEN_ID,
        lastExplicitRoom: 'Cooking',
        lastExplicitRoomId: KITCHEN_ID,
      });
    });
  });

  it('does not migrate an ambiguous legacy name', async () => {
    useNavigationStore.setState({
      currentRoom: 'Kitchen',
      currentRoomId: null,
      lastExplicitRoom: 'Kitchen',
      lastExplicitRoomId: null,
    });
    const workspace = createWorkspace([
      { id: KITCHEN_ID, displayName: 'Kitchen' },
      { id: OFFICE_ID, displayName: ' kitchen ' },
    ]);

    const { result } = renderHook(() => useRoomNavigation('All', workspace));

    expect(result.current.activeRoom).toBe('Kitchen');
    await waitFor(() => {
      expect(useNavigationStore.getState().currentRoomId).toBeNull();
      expect(useNavigationStore.getState().lastExplicitRoomId).toBeNull();
    });
  });

  it('resolves new selections to ids while fallback keeps the preferred identity', () => {
    const workspace = createWorkspace([
      { id: KITCHEN_ID, displayName: 'Kitchen' },
      { id: OFFICE_ID, displayName: 'Office' },
    ]);
    const { result } = renderHook(() => useRoomNavigation('All', workspace));

    act(() => result.current.changeRoom('Kitchen'));
    act(() => result.current.fallbackRoom('Office'));

    expect(useNavigationStore.getState()).toMatchObject({
      currentRoom: 'Office',
      currentRoomId: OFFICE_ID,
      lastExplicitRoom: 'Kitchen',
      lastExplicitRoomId: KITCHEN_ID,
    });
  });

  it('keeps All as the name-only sentinel', () => {
    const workspace = createWorkspace([{ id: KITCHEN_ID, displayName: 'Kitchen' }]);
    const { result } = renderHook(() => useRoomNavigation('All', workspace));

    act(() => result.current.changeRoom('Kitchen'));
    act(() => result.current.changeRoom('All'));

    expect(useNavigationStore.getState()).toMatchObject({
      currentRoom: 'All',
      currentRoomId: null,
      lastExplicitRoom: 'All',
      lastExplicitRoomId: null,
    });
  });
});
