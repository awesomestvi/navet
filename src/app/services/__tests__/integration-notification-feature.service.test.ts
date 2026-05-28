import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConnectionMock } = vi.hoisted(() => ({
  getConnectionMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    getConnection: getConnectionMock,
  },
}));

import { integrationNotificationFeatureService } from '../integration-notification-feature.service';

describe('integrationNotificationFeatureService', () => {
  beforeEach(() => {
    getConnectionMock.mockReset();
  });

  it('collects persistent notifications and repair issues through the HA adapter contract', async () => {
    const sendMessagePromise = vi
      .fn()
      .mockResolvedValueOnce([{ notification_id: 'disk', title: 'Disk space' }])
      .mockResolvedValueOnce([{ issue_id: 'deprecated_yaml', severity: 'warning' }]);
    getConnectionMock.mockReturnValue({ sendMessagePromise });

    await expect(integrationNotificationFeatureService.getSnapshot()).resolves.toEqual({
      persistentNotifications: [{ notification_id: 'disk', title: 'Disk space' }],
      repairIssues: [{ issue_id: 'deprecated_yaml', severity: 'warning' }],
    });
  });

  it('subscribes to persistent notification updates through the adapter', async () => {
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn().mockResolvedValue(unsubscribe);
    getConnectionMock.mockReturnValue({ subscribeMessage });
    const callback = vi.fn();

    await expect(
      integrationNotificationFeatureService.subscribePersistentNotifications(callback)
    ).resolves.toBe(unsubscribe);
    expect(subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: 'persistent_notification/subscribe',
    });
  });
});
