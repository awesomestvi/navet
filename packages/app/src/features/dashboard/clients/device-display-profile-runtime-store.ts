import {
  type DeviceDisplayProfilePolicy,
  emptyDeviceDisplayProfilePolicy,
} from '@navet/app/features/dashboard/clients/device-display-profile';
import { create } from 'zustand';

export type DeviceDisplayProfileSyncStatus = 'disabled' | 'loading' | 'ready' | 'saving' | 'error';

interface DeviceDisplayProfileRuntimeState {
  error: string | null;
  lastSyncedAt: string | null;
  loaded: boolean;
  policy: DeviceDisplayProfilePolicy;
  revision: number;
  status: DeviceDisplayProfileSyncStatus;
  replacePolicy: (policy: DeviceDisplayProfilePolicy, revision: number) => void;
  updatePolicy: (
    updater: (policy: DeviceDisplayProfilePolicy) => DeviceDisplayProfilePolicy
  ) => void;
  markDisabled: () => void;
  markError: (message: string) => void;
  markLoading: () => void;
  markSaving: () => void;
}

export const useDeviceDisplayProfileRuntimeStore = create<DeviceDisplayProfileRuntimeState>(
  (set) => ({
    error: null,
    lastSyncedAt: null,
    loaded: false,
    policy: emptyDeviceDisplayProfilePolicy(),
    revision: 0,
    status: 'loading',
    replacePolicy: (policy, revision) =>
      set({
        error: null,
        lastSyncedAt: new Date().toISOString(),
        loaded: true,
        policy,
        revision,
        status: 'ready',
      }),
    updatePolicy: (updater) =>
      set((state) => ({
        policy: updater(state.policy),
      })),
    markDisabled: () =>
      set({
        error: null,
        loaded: true,
        policy: emptyDeviceDisplayProfilePolicy(),
        revision: 0,
        status: 'disabled',
      }),
    markError: (message) => set({ error: message, status: 'error' }),
    markLoading: () => set({ error: null, loaded: false, status: 'loading' }),
    markSaving: () => set({ error: null, status: 'saving' }),
  })
);
