import { create } from 'zustand';
import type { DashboardClientIdentity, DashboardClientKind } from './dashboard-client-identity';

export type DashboardProfileSyncStatus =
  | 'disabled'
  | 'error'
  | 'idle'
  | 'loading'
  | 'offline'
  | 'saving'
  | 'synced';

export interface DashboardProfileClientRecord {
  id: string;
  name: string;
  kind: DashboardClientKind;
  firstSeenAt: string;
  lastSeenAt: string;
  lastRevision: number | null;
  userName?: string;
}

export interface DashboardProfileActivity {
  id: string;
  revision: number;
  changedAt: string;
  changedPaths: string[];
  actor: {
    clientId: string;
    clientName: string;
    clientKind: DashboardClientKind;
    userId?: string;
    userName?: string;
  };
}

export interface DashboardProfileConflict {
  baseRevision: number | null;
  remoteRevision: number;
  overlappingPaths: string[];
  remoteActivity: DashboardProfileActivity | null;
}

interface DashboardProfileRuntimeState {
  client: DashboardClientIdentity | null;
  clients: DashboardProfileClientRecord[];
  conflict: DashboardProfileConflict | null;
  error: string | null;
  lastActivity: DashboardProfileActivity | null;
  lastSyncedAt: string | null;
  profileId: string | null;
  revision: number | null;
  status: DashboardProfileSyncStatus;
  workspaceId: string | null;
  clearConflict: () => void;
  markDisabled: () => void;
  markError: (error: string) => void;
  markLoading: () => void;
  markOffline: () => void;
  markSaving: () => void;
  markSynced: (input: {
    activity?: DashboardProfileActivity | null;
    at?: string;
    profileId?: string | null;
    revision?: number | null;
    workspaceId?: string | null;
  }) => void;
  reset: () => void;
  setClient: (client: DashboardClientIdentity) => void;
  setClients: (clients: DashboardProfileClientRecord[]) => void;
  setConflict: (conflict: DashboardProfileConflict) => void;
}

const initialState = {
  client: null,
  clients: [] as DashboardProfileClientRecord[],
  conflict: null,
  error: null,
  lastActivity: null,
  lastSyncedAt: null,
  profileId: null,
  revision: null,
  status: 'idle' as DashboardProfileSyncStatus,
  workspaceId: null,
};

export const useDashboardProfileRuntimeStore = create<DashboardProfileRuntimeState>((set) => ({
  ...initialState,
  clearConflict: () => set({ conflict: null }),
  markDisabled: () => set({ conflict: null, error: null, status: 'disabled' }),
  markError: (error) => set({ error, status: 'error' }),
  markLoading: () => set({ error: null, status: 'loading' }),
  markOffline: () => set({ status: 'offline' }),
  markSaving: () => set({ error: null, status: 'saving' }),
  markSynced: ({ activity, at = new Date().toISOString(), profileId, revision, workspaceId }) =>
    set((state) => ({
      conflict: null,
      error: null,
      lastActivity: activity === undefined ? state.lastActivity : activity,
      lastSyncedAt: at,
      profileId: profileId === undefined ? state.profileId : profileId,
      revision: revision === undefined ? state.revision : revision,
      status: 'synced',
      workspaceId: workspaceId === undefined ? state.workspaceId : workspaceId,
    })),
  reset: () => set(initialState),
  setClient: (client) => set({ client }),
  setClients: (clients) =>
    set({
      clients: [...clients].sort(
        (left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt)
      ),
    }),
  setConflict: (conflict) => set({ conflict, status: 'synced' }),
}));
