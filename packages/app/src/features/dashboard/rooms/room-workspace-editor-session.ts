import type { RoomWorkspaceStage } from './components';
import type { PendingProviderRoomDeletion } from './room-workspace-mutation-transaction';
import type {
  RoomWorkspaceGroupId,
  RoomWorkspaceRoomId,
  RoomWorkspaceV2,
} from './room-workspace-v2';

export type RoomWorkspacePendingOperation =
  | { kind: 'create-room'; groupId?: RoomWorkspaceGroupId }
  | { kind: 'create-group' }
  | { kind: 'rename-group'; groupId: RoomWorkspaceGroupId }
  | { kind: 'appearance-group'; groupId: RoomWorkspaceGroupId }
  | { kind: 'merge-room'; sourceRoomId: RoomWorkspaceRoomId }
  | {
      kind: 'move-device';
      deviceId: string;
      sourceRoomId: RoomWorkspaceRoomId;
    }
  | { kind: 'split-room'; sourceRoomId: RoomWorkspaceRoomId }
  | { kind: 'appearance'; roomId: RoomWorkspaceRoomId }
  | { kind: 'delete-room'; roomId: RoomWorkspaceRoomId }
  | { kind: 'delete-group'; groupId: RoomWorkspaceGroupId };

export interface RoomWorkspaceSaveOutcome {
  kind: 'idle' | 'saved' | 'partial' | 'error';
  failureCount?: number;
}

export interface RoomWorkspaceEditorSession {
  committedWorkspace: RoomWorkspaceV2 | null;
  draftWorkspace: RoomWorkspaceV2 | null;
  selectedRoomId: RoomWorkspaceRoomId | null;
  stage: RoomWorkspaceStage;
  pendingPlacements: Record<string, RoomWorkspaceRoomId | null>;
  roomNameDrafts: Partial<Record<RoomWorkspaceRoomId, string>>;
  pendingProviderDeletions: PendingProviderRoomDeletion[];
  pendingOperation: RoomWorkspacePendingOperation | null;
  isSaving: boolean;
  saveOutcome: RoomWorkspaceSaveOutcome;
}

type ValueUpdate<T> = T | ((current: T) => T);

export type RoomWorkspaceEditorSessionAction =
  | {
      type: 'opened';
      workspace: RoomWorkspaceV2;
      selectedRoomId: RoomWorkspaceRoomId | null;
    }
  | { type: 'set-draft'; update: ValueUpdate<RoomWorkspaceV2 | null> }
  | { type: 'set-selected-room'; roomId: RoomWorkspaceRoomId | null }
  | {
      type: 'set-pending-placements';
      update: ValueUpdate<Record<string, RoomWorkspaceRoomId | null>>;
    }
  | {
      type: 'set-room-name-drafts';
      update: ValueUpdate<Partial<Record<RoomWorkspaceRoomId, string>>>;
    }
  | {
      type: 'set-provider-deletions';
      update: ValueUpdate<PendingProviderRoomDeletion[]>;
    }
  | { type: 'set-operation'; operation: RoomWorkspacePendingOperation | null }
  | { type: 'set-stage'; stage: RoomWorkspaceStage }
  | { type: 'mark-dirty' }
  | { type: 'save-started' }
  | {
      type: 'save-failed';
      outcome: RoomWorkspaceSaveOutcome;
      pendingPlacements: Record<string, RoomWorkspaceRoomId | null>;
      pendingProviderDeletions: PendingProviderRoomDeletion[];
    }
  | { type: 'save-succeeded'; workspace: RoomWorkspaceV2 }
  | { type: 'discarded'; selectedRoomId: RoomWorkspaceRoomId | null };

export function createRoomWorkspaceEditorSession(
  workspace: RoomWorkspaceV2 | null
): RoomWorkspaceEditorSession {
  return {
    committedWorkspace: workspace,
    draftWorkspace: workspace,
    selectedRoomId: null,
    stage: 'structure',
    pendingPlacements: {},
    roomNameDrafts: {},
    pendingProviderDeletions: [],
    pendingOperation: null,
    isSaving: false,
    saveOutcome: { kind: 'idle' },
  };
}

function applyUpdate<T>(current: T, update: ValueUpdate<T>): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update;
}

/**
 * Owns the atomic transitions of one room-editor session. Provider mutations
 * happen in the transaction module; this reducer decides what remains dirty,
 * committed, selected, and retryable after each transaction outcome.
 */
export function roomWorkspaceEditorSessionReducer(
  state: RoomWorkspaceEditorSession,
  action: RoomWorkspaceEditorSessionAction
): RoomWorkspaceEditorSession {
  switch (action.type) {
    case 'opened':
      return {
        ...createRoomWorkspaceEditorSession(action.workspace),
        selectedRoomId: action.selectedRoomId,
      };
    case 'set-draft':
      return { ...state, draftWorkspace: applyUpdate(state.draftWorkspace, action.update) };
    case 'set-selected-room':
      return { ...state, selectedRoomId: action.roomId };
    case 'set-pending-placements':
      return {
        ...state,
        pendingPlacements: applyUpdate(state.pendingPlacements, action.update),
      };
    case 'set-room-name-drafts':
      return { ...state, roomNameDrafts: applyUpdate(state.roomNameDrafts, action.update) };
    case 'set-provider-deletions':
      return {
        ...state,
        pendingProviderDeletions: applyUpdate(state.pendingProviderDeletions, action.update),
      };
    case 'set-operation':
      return { ...state, pendingOperation: action.operation };
    case 'set-stage':
      return { ...state, stage: action.stage };
    case 'mark-dirty':
      return { ...state, saveOutcome: { kind: 'idle' } };
    case 'save-started':
      return { ...state, isSaving: true, saveOutcome: { kind: 'idle' } };
    case 'save-failed':
      return {
        ...state,
        isSaving: false,
        stage: 'impact-review',
        saveOutcome: action.outcome,
        pendingPlacements: action.pendingPlacements,
        pendingProviderDeletions: action.pendingProviderDeletions,
      };
    case 'save-succeeded':
      return {
        ...state,
        committedWorkspace: action.workspace,
        draftWorkspace: action.workspace,
        pendingPlacements: {},
        roomNameDrafts: {},
        pendingProviderDeletions: [],
        pendingOperation: null,
        isSaving: false,
        stage: 'room-details',
        saveOutcome: { kind: 'saved' },
      };
    case 'discarded':
      return {
        ...state,
        draftWorkspace: state.committedWorkspace,
        selectedRoomId: action.selectedRoomId,
        pendingPlacements: {},
        roomNameDrafts: {},
        pendingProviderDeletions: [],
        pendingOperation: null,
        isSaving: false,
        stage: action.selectedRoomId ? 'room-details' : 'structure',
        saveOutcome: { kind: 'idle' },
      };
  }
}
