import { runProviderContractTests } from '@navet/core/contract-test-suite';
import { createProviderScopedId } from '@navet/core/ids';
import { createHomeyContractAdapter } from '@navet/provider-homey/homey-adapter';
import { beforeEach, expect, vi } from 'vitest';
import { configureHomeyBridge } from './homey-bridge';
import type { HomeySnapshot } from './homey-types';

const {
  ensureHomeyApiClientConfiguredMock,
  homeyCallServiceMock,
  homeyLoadSnapshotMock,
  homeyReplaceSnapshotMock,
  homeyResetSnapshotMock,
  homeyListeners,
  homeyState,
  emitHomeySnapshot,
} = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const createInitialSnapshot = (): HomeySnapshot => ({
    connected: true,
    devices: {
      'device-1': {
        id: 'device-1',
        name: 'Kitchen Lamp',
        class: 'light',
        zone: 'zone-1',
        capabilities: ['onoff', 'dim'],
        capabilitiesObj: {
          onoff: { value: true, title: 'Power' },
          dim: { value: 0.6, title: 'Dim' },
        },
        available: true,
      },
    },
    zones: {
      'zone-1': {
        id: 'zone-1',
        name: 'Kitchen',
        parent: null,
      },
    },
  });
  const state = {
    snapshot: createInitialSnapshot() as HomeySnapshot,
    createInitialSnapshot,
  };

  const emitSnapshot = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    ensureHomeyApiClientConfiguredMock: vi.fn(),
    homeyCallServiceMock: vi.fn(),
    homeyLoadSnapshotMock: vi.fn(async () => state.snapshot),
    homeyReplaceSnapshotMock: vi.fn((snapshot: typeof state.snapshot) => {
      state.snapshot = snapshot;
      emitSnapshot();
    }),
    homeyResetSnapshotMock: vi.fn(() => {
      state.snapshot = {
        connected: false,
        devices: {},
        zones: {},
      };
      emitSnapshot();
    }),
    homeyListeners: listeners,
    homeyState: state,
    emitHomeySnapshot: emitSnapshot,
  };
});

beforeEach(() => {
  ensureHomeyApiClientConfiguredMock.mockReset();
  homeyCallServiceMock.mockReset();
  homeyLoadSnapshotMock.mockClear();
  homeyReplaceSnapshotMock.mockClear();
  homeyResetSnapshotMock.mockClear();
  homeyState.snapshot = homeyState.createInitialSnapshot();
  homeyListeners.clear();
  currentSession = null;
  configureHomeyBridge({
    ensureConfigured: ensureHomeyApiClientConfiguredMock,
    getSnapshot: () => homeyState.snapshot,
    loadSnapshot: homeyLoadSnapshotMock,
    replaceSnapshot: homeyReplaceSnapshotMock,
    resetSnapshot: homeyResetSnapshotMock,
    subscribe: (listener) => {
      homeyListeners.add(listener);
      return () => {
        homeyListeners.delete(listener);
      };
    },
    callService: homeyCallServiceMock,
    entityRuntimeService: {
      getEntitySnapshots: () => null,
      subscribeEntitySnapshots: () => () => {},
      getEntityRegistryEntries: () => [],
      subscribeEntityRegistryEntries: () => () => {},
      getConfig: () => null,
      subscribeConfig: () => () => {},
    },
  });
});

let currentSession: {
  providerId: 'homey';
  runtime: string;
  authMode: string;
  haBaseUrl: string;
  hassUrl: string;
} | null = null;

runProviderContractTests({
  providerName: 'Homey',
  createAdapter: () =>
    createHomeyContractAdapter(undefined, {
      getSession: () => currentSession,
    }),
  setAuthenticatedSession: () => {
    currentSession = {
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.test',
      hassUrl: 'https://homey.example.test',
    };
  },
  clearAuthenticatedSession: () => {
    currentSession = null;
  },
  createCommand: (entity) => ({
    type: 'turn_off',
    entityId: entity.id,
  }),
  expectConnected: () => {
    expect(ensureHomeyApiClientConfiguredMock).toHaveBeenCalled();
    expect(homeyLoadSnapshotMock).toHaveBeenCalled();
  },
  expectDisconnected: () => {
    expect(homeyResetSnapshotMock).toHaveBeenCalled();
  },
  expectCommandDispatched: () => {
    expect(homeyCallServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_off',
      {},
      { entityId: 'device-1' }
    );
  },
  getLookupIds: (entity) => [entity.externalId, createProviderScopedId('homey', entity.externalId)],
  emitEntityUpdate: () => {
    homeyState.snapshot = {
      ...homeyState.snapshot,
      devices: {
        ...homeyState.snapshot.devices,
        'device-1': {
          ...homeyState.snapshot.devices['device-1'],
          capabilitiesObj: {
            ...homeyState.snapshot.devices['device-1'].capabilitiesObj,
            dim: { value: 0.2, title: 'Dim' },
          },
        },
      },
    };
    emitHomeySnapshot();
  },
  emitEntityAdded: () => {
    homeyState.snapshot = {
      ...homeyState.snapshot,
      devices: {
        ...homeyState.snapshot.devices,
        'device-2': {
          id: 'device-2',
          name: 'Hall Light',
          class: 'light',
          zone: 'zone-1',
          capabilities: ['onoff'],
          capabilitiesObj: {
            onoff: { value: true, title: 'Power' },
          },
          available: true,
        },
      },
    };
    emitHomeySnapshot();
  },
  emitEntityRemoved: () => {
    const nextDevices = { ...homeyState.snapshot.devices };
    delete nextDevices['device-1'];
    homeyState.snapshot = {
      ...homeyState.snapshot,
      devices: nextDevices,
    };
    emitHomeySnapshot();
  },
  setUnavailableSnapshot: () => {
    homeyState.snapshot = {
      ...homeyState.snapshot,
      devices: {
        'device-1': {
          ...homeyState.snapshot.devices['device-1'],
          available: false,
        },
      },
    };
  },
  setMalformedSnapshot: () => {
    homeyState.snapshot = {
      ...homeyState.snapshot,
      devices: {
        'device-1': homeyState.snapshot.devices['device-1'],
        broken: {
          id: 'broken',
          name: 'Broken Device',
          capabilitiesObj: {},
        },
      },
    } as HomeySnapshot;
  },
});
