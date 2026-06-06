import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  openhabEntityRuntimeService,
  resetOpenhabEntityRuntimeServiceCachesForTests,
} from './openhab-entity-runtime.service';
import { openhabService } from './openhab-service';

describe('openhabEntityRuntimeService', () => {
  afterEach(() => {
    openhabService.resetSnapshot();
    resetOpenhabEntityRuntimeServiceCachesForTests();
  });

  it('normalizes switch item states for live entity snapshots', () => {
    openhabService.replaceSnapshot({
      connected: true,
      items: {
        Demo_Kitchen_Switch: {
          name: 'Demo_Kitchen_Switch',
          type: 'Switch',
          label: 'Kitchen Switch',
          state: 'ON',
          groupNames: [],
        },
      },
      error: null,
    });

    expect(openhabEntityRuntimeService.getEntitySnapshots()?.Demo_Kitchen_Switch).toMatchObject({
      entityId: 'Demo_Kitchen_Switch',
      state: 'on',
    });
  });

  it('normalizes dimmer item states and exposes brightness for live entity snapshots', () => {
    openhabService.replaceSnapshot({
      connected: true,
      items: {
        DeskLamp: {
          name: 'DeskLamp',
          type: 'Dimmer',
          label: 'Desk Lamp',
          state: '42',
          groupNames: [],
        },
        NightLamp: {
          name: 'NightLamp',
          type: 'Dimmer',
          label: 'Night Lamp',
          state: '0',
          groupNames: [],
        },
      },
      error: null,
    });

    expect(openhabEntityRuntimeService.getEntitySnapshots()?.DeskLamp).toMatchObject({
      entityId: 'DeskLamp',
      state: 'on',
      attributes: expect.objectContaining({
        brightness_pct: 42,
      }),
    });
    expect(openhabEntityRuntimeService.getEntitySnapshots()?.NightLamp).toMatchObject({
      entityId: 'NightLamp',
      state: 'off',
      attributes: expect.objectContaining({
        brightness_pct: 0,
      }),
    });
  });

  it('reuses unchanged item snapshot references when unrelated openHAB items change', () => {
    openhabService.replaceSnapshot({
      connected: true,
      items: {
        Demo_Kitchen_Switch: {
          name: 'Demo_Kitchen_Switch',
          type: 'Switch',
          label: 'Kitchen Switch',
          state: 'ON',
          groupNames: [],
        },
      },
      error: null,
    });

    const firstSnapshot = openhabEntityRuntimeService.getEntitySnapshot?.('Demo_Kitchen_Switch');

    openhabService.replaceSnapshot({
      connected: true,
      items: {
        Demo_Kitchen_Switch: {
          name: 'Demo_Kitchen_Switch',
          type: 'Switch',
          label: 'Kitchen Switch',
          state: 'ON',
          groupNames: [],
        },
        Demo_Hall_Switch: {
          name: 'Demo_Hall_Switch',
          type: 'Switch',
          label: 'Hall Switch',
          state: 'OFF',
          groupNames: [],
        },
      },
      error: null,
    });

    expect(openhabEntityRuntimeService.getEntitySnapshot?.('Demo_Kitchen_Switch')).toBe(
      firstSnapshot
    );
  });

  it('updates derived room attributes when a semantic parent location changes', () => {
    openhabService.replaceSnapshot({
      connected: true,
      items: {
        LivingRoom: {
          name: 'LivingRoom',
          type: 'Group',
          label: 'Living Room',
          tags: ['Location', 'LivingRoom'],
          groupNames: [],
        },
        LivingRoomLamp: {
          name: 'LivingRoomLamp',
          type: 'Switch',
          label: 'Living Room Lamp',
          state: 'ON',
          groupNames: ['LivingRoom'],
        },
      },
      error: null,
    });

    const firstSnapshot = openhabEntityRuntimeService.getEntitySnapshot?.('LivingRoomLamp');

    openhabService.replaceSnapshot({
      connected: true,
      items: {
        LivingRoom: {
          name: 'LivingRoom',
          type: 'Group',
          label: 'Den',
          tags: ['Location', 'LivingRoom'],
          groupNames: [],
        },
        LivingRoomLamp: {
          name: 'LivingRoomLamp',
          type: 'Switch',
          label: 'Living Room Lamp',
          state: 'ON',
          groupNames: ['LivingRoom'],
        },
      },
      error: null,
    });

    const nextSnapshot = openhabEntityRuntimeService.getEntitySnapshot?.('LivingRoomLamp');

    expect(nextSnapshot).not.toBe(firstSnapshot);
    expect(nextSnapshot?.attributes.room).toBe('Den');
  });

  it('notifies entity listeners only when the subscribed openHAB item changes', () => {
    openhabService.replaceSnapshot({
      connected: true,
      items: {
        Demo_Kitchen_Switch: {
          name: 'Demo_Kitchen_Switch',
          type: 'Switch',
          label: 'Kitchen Switch',
          state: 'ON',
          groupNames: [],
        },
      },
      error: null,
    });

    const listener = vi.fn();
    const unsubscribe = openhabEntityRuntimeService.subscribeEntitySnapshot?.(
      'Demo_Kitchen_Switch',
      listener
    );

    openhabService.replaceSnapshot({
      connected: true,
      items: {
        Demo_Kitchen_Switch: {
          name: 'Demo_Kitchen_Switch',
          type: 'Switch',
          label: 'Kitchen Switch',
          state: 'ON',
          groupNames: [],
        },
        Demo_Hall_Switch: {
          name: 'Demo_Hall_Switch',
          type: 'Switch',
          label: 'Hall Switch',
          state: 'OFF',
          groupNames: [],
        },
      },
      error: null,
    });

    expect(listener).not.toHaveBeenCalled();

    openhabService.replaceSnapshot({
      connected: true,
      items: {
        Demo_Kitchen_Switch: {
          name: 'Demo_Kitchen_Switch',
          type: 'Switch',
          label: 'Kitchen Switch',
          state: 'OFF',
          groupNames: [],
        },
        Demo_Hall_Switch: {
          name: 'Demo_Hall_Switch',
          type: 'Switch',
          label: 'Hall Switch',
          state: 'OFF',
          groupNames: [],
        },
      },
      error: null,
    });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe?.();
  });
});
