import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callHomeAssistantServiceMock, getHomeAssistantConnectionMock } = vi.hoisted(() => ({
  callHomeAssistantServiceMock: vi.fn(),
  getHomeAssistantConnectionMock: vi.fn(),
}));

vi.mock('./homeassistant-service-bridge', () => ({
  callHomeAssistantService: callHomeAssistantServiceMock,
  getHomeAssistantConnection: getHomeAssistantConnectionMock,
}));

import { homeAssistantNotificationFeatureService } from './homeassistant-notification-feature.service';

describe('homeAssistantNotificationFeatureService', () => {
  beforeEach(() => {
    callHomeAssistantServiceMock.mockReset();
    getHomeAssistantConnectionMock.mockReset();
  });

  it('normalizes Home Assistant alert markup in persistent notification snapshots', async () => {
    const sendMessagePromise = vi
      .fn()
      .mockResolvedValueOnce([
        {
          notification_id: 'restart-required',
          title: 'Supervisor',
          message: "<ha-alert alert-type='error'>Restart of Home Assistant required</ha-alert>",
        },
      ])
      .mockResolvedValueOnce([]);

    await expect(
      homeAssistantNotificationFeatureService.getSnapshot({ messageClient: { sendMessagePromise } })
    ).resolves.toEqual({
      persistentNotifications: [
        {
          notification_id: 'restart-required',
          title: 'Supervisor',
          message: 'Restart of Home Assistant required',
        },
      ],
      repairIssues: [],
    });
  });

  it('normalizes Home Assistant alert markup in subscription updates', async () => {
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn(async (callback: (event: unknown) => void) => {
      callback({
        update_type: 'current',
        notifications: [
          {
            notification_id: 'restart-required',
            title: 'Supervisor',
            message: "<ha-alert alert-type='error'>Restart of Home Assistant required</ha-alert>",
          },
        ],
      });
      return unsubscribe;
    });
    const callback = vi.fn();

    await expect(
      homeAssistantNotificationFeatureService.subscribePersistentNotifications(callback, {
        messageClient: { sendMessagePromise: vi.fn(), subscribeMessage },
      })
    ).resolves.toBe(unsubscribe);

    expect(callback).toHaveBeenCalledWith({
      update_type: 'current',
      notifications: [
        {
          notification_id: 'restart-required',
          title: 'Supervisor',
          message: 'Restart of Home Assistant required',
        },
      ],
    });
  });
});
