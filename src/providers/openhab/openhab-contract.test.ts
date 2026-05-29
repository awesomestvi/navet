import { integrationSessionRuntime } from '@navet/app/integration-session-runtime';
import { runProviderContractTests } from '@navet/core/contract-test-suite';
import { createProviderScopedId } from '@navet/core/ids';
import { createOpenHABContractAdapter } from '@navet/provider-openhab/openhab-adapter';
import { beforeEach, expect, vi } from 'vitest';
import type { OpenHABSnapshot } from '@/app/types/openhab';

const {
  openhabLoadSnapshotMock,
  openhabSetClientMock,
  openhabSendItemCommandMock,
  openhabResetSnapshotMock,
  openhabListeners,
  openhabState,
  openhabFixtures,
  emitOpenHABSnapshot,
} = vi.hoisted(() => {
  const listeners = new Set<(snapshot: OpenHABSnapshot) => void>();
  const fixtures = {
    livingRoom: {
      name: 'LivingRoom',
      type: 'Group',
      label: 'Living Room',
      tags: ['Location', 'LivingRoom'],
      groupNames: ['GroundFloor'],
    },
    livingRoomLamp: {
      name: 'LivingRoomLamp',
      type: 'Switch',
      label: 'Living Room Lamp',
      state: 'ON',
      category: 'light',
      tags: ['Light'],
      groupNames: ['LivingRoom'],
    },
    livingRoomLampDimmer: {
      name: 'LivingRoomLamp_Dimmer',
      type: 'Dimmer',
      label: 'Living Room Lamp Brightness',
      state: '60',
      category: 'light',
      tags: ['Light'],
      groupNames: ['LivingRoom'],
    },
    livingRoomBlind: {
      name: 'LivingRoomBlind',
      type: 'Rollershutter',
      label: 'Living Room Blind',
      state: '75',
      category: 'blinds',
      tags: ['Blinds'],
      groupNames: ['LivingRoom'],
    },
    frontDoorLock: {
      name: 'FrontDoorLock',
      type: 'String',
      label: 'Front Door Lock',
      state: 'LOCKED',
      category: 'lock',
      tags: ['Lock'],
      groupNames: ['GroundFloor'],
    },
    livingRoomTemperature: {
      name: 'LivingRoomTemperature',
      type: 'Number:Temperature',
      label: 'Living Room Temperature',
      state: '21.5 °C',
      category: 'temperature',
      tags: ['Measurement', 'Temperature'],
      groupNames: ['LivingRoom'],
    },
    kitchenLight: {
      name: 'KitchenLight',
      type: 'Switch',
      label: 'Kitchen Light',
      state: 'ON',
      category: 'light',
      tags: ['Light'],
      groupNames: ['Kitchen'],
    },
  } satisfies Record<string, Record<string, unknown>>;
  const createInitialSnapshot = (): OpenHABSnapshot => ({
    connected: true,
    items: {
      LivingRoom: fixtures.livingRoom,
      LivingRoomLamp: fixtures.livingRoomLamp,
      LivingRoomLamp_Dimmer: fixtures.livingRoomLampDimmer,
      LivingRoomBlind: fixtures.livingRoomBlind,
      FrontDoorLock: fixtures.frontDoorLock,
      LivingRoomTemperature: fixtures.livingRoomTemperature,
    },
  });

  const state = {
    snapshot: createInitialSnapshot() as OpenHABSnapshot,
    createInitialSnapshot,
  };

  const emitSnapshot = () => {
    for (const listener of listeners) {
      listener(state.snapshot);
    }
  };

  return {
    openhabLoadSnapshotMock: vi.fn(async () => state.snapshot),
    openhabSetClientMock: vi.fn(),
    openhabSendItemCommandMock: vi.fn(),
    openhabResetSnapshotMock: vi.fn(() => {
      state.snapshot = {
        connected: false,
        items: {},
      };
      emitSnapshot();
    }),
    openhabListeners: listeners,
    openhabState: state,
    openhabFixtures: fixtures,
    emitOpenHABSnapshot: emitSnapshot,
  };
});

vi.mock('./openhab-service', () => ({
  createOpenHABSnapshotClient: vi.fn(() => ({
    loadSnapshot: openhabLoadSnapshotMock,
    subscribeSnapshot: (listener: (snapshot: OpenHABSnapshot) => void) => {
      openhabListeners.add(listener);
      return () => {
        openhabListeners.delete(listener);
      };
    },
    sendItemCommand: openhabSendItemCommandMock,
  })),
  openhabService: {
    setClient: openhabSetClientMock,
    loadSnapshot: openhabLoadSnapshotMock,
    getSnapshot: () => openhabState.snapshot,
    resetSnapshot: openhabResetSnapshotMock,
    subscribe: (listener: () => void) => {
      const wrapped = () => listener();
      openhabListeners.add(wrapped as unknown as (snapshot: OpenHABSnapshot) => void);
      return () => {
        openhabListeners.delete(wrapped as unknown as (snapshot: OpenHABSnapshot) => void);
      };
    },
    sendItemCommand: openhabSendItemCommandMock,
  },
}));

beforeEach(() => {
  openhabLoadSnapshotMock.mockClear();
  openhabSetClientMock.mockClear();
  openhabSendItemCommandMock.mockClear();
  openhabResetSnapshotMock.mockClear();
  openhabState.snapshot = openhabState.createInitialSnapshot();
  openhabListeners.clear();
  integrationSessionRuntime.replaceSession(null);
});

runProviderContractTests({
  providerName: 'openHAB',
  createAdapter: () => createOpenHABContractAdapter(),
  setAuthenticatedSession: () => {
    integrationSessionRuntime.replaceSession({
      providerId: 'openhab',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://openhab.local',
      hassUrl: 'http://openhab.local',
    });
  },
  clearAuthenticatedSession: () => {
    integrationSessionRuntime.replaceSession(null);
  },
  createCommand: (entity) => ({
    type: 'turn_off',
    entityId: entity.id,
  }),
  expectConnected: () => {
    expect(openhabSetClientMock).toHaveBeenCalled();
    expect(openhabLoadSnapshotMock).toHaveBeenCalled();
  },
  expectDisconnected: () => {
    expect(openhabResetSnapshotMock).toHaveBeenCalled();
  },
  expectCommandDispatched: () => {
    expect(openhabSendItemCommandMock).toHaveBeenCalledWith('LivingRoomLamp', 'OFF');
  },
  getLookupIds: (entity) => [
    entity.externalId,
    createProviderScopedId('openhab', entity.externalId),
  ],
  emitEntityUpdate: () => {
    openhabState.snapshot = {
      ...openhabState.snapshot,
      items: {
        ...openhabState.snapshot.items,
        LivingRoomLamp: {
          ...openhabState.snapshot.items.LivingRoomLamp,
          state: 'OFF',
        },
      },
    };
    emitOpenHABSnapshot();
  },
  emitEntityAdded: () => {
    openhabState.snapshot = {
      ...openhabState.snapshot,
      items: {
        ...openhabState.snapshot.items,
        KitchenLight: openhabFixtures.kitchenLight,
      },
    };
    emitOpenHABSnapshot();
  },
  emitEntityRemoved: () => {
    const nextItems = { ...openhabState.snapshot.items };
    delete nextItems.LivingRoomTemperature;
    openhabState.snapshot = {
      ...openhabState.snapshot,
      items: nextItems,
    };
    emitOpenHABSnapshot();
  },
  setUnavailableSnapshot: () => {
    openhabState.snapshot = {
      connected: false,
      items: {
        LivingRoomLamp: {
          ...openhabFixtures.livingRoomLamp,
          state: 'UNDEF',
        },
      },
    };
  },
  setMalformedSnapshot: () => {
    openhabState.snapshot = {
      connected: true,
      items: {
        LivingRoomLamp: openhabFixtures.livingRoomLamp,
        broken: {} as never,
      },
    };
  },
});
