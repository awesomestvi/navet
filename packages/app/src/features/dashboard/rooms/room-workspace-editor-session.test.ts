import { describe, expect, it } from 'vitest';
import {
  createRoomWorkspaceEditorSession,
  roomWorkspaceEditorSessionReducer,
} from './room-workspace-editor-session';
import {
  ROOM_WORKSPACE_VERSION,
  type RoomWorkspaceRoomId,
  type RoomWorkspaceV2,
} from './room-workspace-v2';

const roomId = 'room-1' as RoomWorkspaceRoomId;
const workspace: RoomWorkspaceV2 = {
  version: ROOM_WORKSPACE_VERSION,
  rooms: [
    {
      id: roomId,
      displayName: 'Kitchen',
      origin: 'navet',
      sourceRefs: [],
      metadata: { order: 0, visibility: 'visible' },
    },
  ],
  groups: [],
  reviewIssues: [],
};

describe('roomWorkspaceEditorSessionReducer', () => {
  it('opens, saves, and discards editor state atomically', () => {
    const opened = roomWorkspaceEditorSessionReducer(createRoomWorkspaceEditorSession(null), {
      type: 'opened',
      workspace,
      selectedRoomId: roomId,
    });
    const dirty = roomWorkspaceEditorSessionReducer(opened, {
      type: 'set-pending-placements',
      update: { 'light.kitchen': roomId },
    });
    const saving = roomWorkspaceEditorSessionReducer(dirty, { type: 'save-started' });
    expect(saving.isSaving).toBe(true);

    const failed = roomWorkspaceEditorSessionReducer(saving, {
      type: 'save-failed',
      outcome: { kind: 'partial', failureCount: 1 },
      pendingPlacements: { 'light.kitchen': roomId },
      pendingProviderDeletions: [],
    });
    expect(failed).toMatchObject({
      isSaving: false,
      stage: 'impact-review',
      saveOutcome: { kind: 'partial', failureCount: 1 },
    });

    const discarded = roomWorkspaceEditorSessionReducer(failed, {
      type: 'discarded',
      selectedRoomId: roomId,
    });
    expect(discarded.draftWorkspace).toBe(discarded.committedWorkspace);
    expect(discarded.pendingPlacements).toEqual({});
    expect(discarded.stage).toBe('room-details');
  });

  it('commits a successful transaction and clears retry state together', () => {
    const initial = {
      ...createRoomWorkspaceEditorSession(workspace),
      pendingPlacements: { 'light.kitchen': roomId },
      roomNameDrafts: { [roomId]: 'Kitchen' },
      isSaving: true,
    };
    const saved = roomWorkspaceEditorSessionReducer(initial, {
      type: 'save-succeeded',
      workspace,
    });
    expect(saved.committedWorkspace).toBe(workspace);
    expect(saved.draftWorkspace).toBe(workspace);
    expect(saved.pendingPlacements).toEqual({});
    expect(saved.roomNameDrafts).toEqual({});
    expect(saved.saveOutcome).toEqual({ kind: 'saved' });
    expect(saved.isSaving).toBe(false);
  });
});
