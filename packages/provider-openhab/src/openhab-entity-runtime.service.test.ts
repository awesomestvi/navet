import { afterEach, describe, expect, it } from 'vitest';
import { openhabEntityRuntimeService } from './openhab-entity-runtime.service';
import { openhabService } from './openhab-service';

describe('openhabEntityRuntimeService', () => {
  afterEach(() => {
    openhabService.resetSnapshot();
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
});
