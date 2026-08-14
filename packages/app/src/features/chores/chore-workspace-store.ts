import {
  loadChoreWorkspace,
  sendChoreWorkspaceCommand,
} from '@navet/app/services/chore-workspace.service';
import type { ChoreActivity, ChoreWorkspaceData } from '@navet/core/chores';
import { create } from 'zustand';
import { createChoreCommandId } from './chore-workspace-model';

export type ChoreWorkspaceStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'saving'
  | 'unavailable'
  | 'unauthorized'
  | 'error';

type WorkspaceMutation = (input: {
  commandId: string;
  data: ChoreWorkspaceData;
  timestamp: string;
}) => { activity: ChoreActivity; data: ChoreWorkspaceData };

interface ChoreWorkspaceState {
  data: ChoreWorkspaceData | null;
  error: string | null;
  revision: number | null;
  status: ChoreWorkspaceStatus;
  load: (options?: { force?: boolean }) => Promise<void>;
  mutate: (mutation: WorkspaceMutation) => Promise<boolean>;
  reset: () => void;
  setPreviewDocument: (input: { data: ChoreWorkspaceData; revision?: number }) => void;
}

let loadPromise: Promise<void> | null = null;
let mutationQueue: Promise<boolean> = Promise.resolve(true);

const initialState = {
  data: null,
  error: null,
  revision: null,
  status: 'idle' as ChoreWorkspaceStatus,
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Chore workspace sync failed';
}

export const useChoreWorkspaceStore = create<ChoreWorkspaceState>((set, get) => ({
  ...initialState,
  load: async (options) => {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const current = get();
      if (!current.data) set({ error: null, status: 'loading' });
      try {
        const result = await loadChoreWorkspace(
          options?.force ? undefined : (current.revision ?? undefined)
        );
        if (result.unauthorized) {
          set({ error: null, status: 'unauthorized' });
          return;
        }
        if (!result.available) {
          set({ error: null, status: 'unavailable' });
          return;
        }
        if (result.notModified) {
          set({ error: null, revision: result.revision ?? current.revision, status: 'ready' });
          return;
        }
        if (result.document) {
          set({
            data: result.document.data,
            error: null,
            revision: result.document.revision,
            status: 'ready',
          });
        }
      } catch (error) {
        set({ error: errorMessage(error), status: 'error' });
      }
    })().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  },
  mutate: async (mutation) => {
    const run = async () => {
      const commandId = createChoreCommandId();
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const current = get();
        if (!current.data || current.revision === null) return false;
        const timestamp = new Date().toISOString();
        let next: ReturnType<WorkspaceMutation>;
        try {
          next = mutation({ commandId, data: current.data, timestamp });
        } catch (error) {
          set({ error: errorMessage(error), status: 'error' });
          return false;
        }
        const data = {
          ...next.data,
          activity: [...next.data.activity, next.activity].slice(-5000),
        };
        set({ error: null, status: 'saving' });
        const result = await sendChoreWorkspaceCommand({
          commandId,
          baseRevision: current.revision,
          data,
        });
        if (result.saved && result.document) {
          set({
            data: result.document.data,
            error: null,
            revision: result.document.revision,
            status: 'ready',
          });
          return true;
        }
        if (result.preconditionFailed && attempt === 0) {
          await get().load({ force: true });
          continue;
        }
        set({
          error: result.unauthorized ? null : 'Chore workspace sync failed',
          status: result.unauthorized ? 'unauthorized' : 'error',
        });
        return false;
      }
      return false;
    };
    const queued = mutationQueue.then(run, run);
    mutationQueue = queued;
    return queued;
  },
  reset: () => set(initialState),
  setPreviewDocument: ({ data, revision = 1 }) =>
    set({ data, error: null, revision, status: 'ready' }),
}));
