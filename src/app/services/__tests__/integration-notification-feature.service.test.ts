import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityActionMock, dispatchServiceActionMock, getConnectionMock } = vi.hoisted(
  () => ({
    dispatchEntityActionMock: vi.fn(),
    dispatchServiceActionMock: vi.fn(),
    getConnectionMock: vi.fn(),
  })
);

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    getConnection: getConnectionMock,
  },
}));

vi.mock('../integration-action.service', () => ({
  dispatchEntityAction: dispatchEntityActionMock,
  dispatchServiceAction: dispatchServiceActionMock,
}));

import { integrationNotificationFeatureService } from '../integration-notification-feature.service';

describe('integrationNotificationFeatureService', () => {
  beforeEach(() => {
    dispatchEntityActionMock.mockReset();
    dispatchServiceActionMock.mockReset();
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

  it('accepts an injected message client for notification queries and subscriptions', async () => {
    const sendMessagePromise = vi
      .fn()
      .mockResolvedValueOnce([{ notification_id: 'backup', title: 'Backup' }])
      .mockResolvedValueOnce([{ issue_id: 'integration_issue', severity: 'error' }]);
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn().mockResolvedValue(unsubscribe);

    await expect(
      integrationNotificationFeatureService.getSnapshot({
        messageClient: { sendMessagePromise, subscribeMessage },
      })
    ).resolves.toEqual({
      persistentNotifications: [{ notification_id: 'backup', title: 'Backup' }],
      repairIssues: [{ issue_id: 'integration_issue', severity: 'error' }],
    });

    await expect(
      integrationNotificationFeatureService.subscribePersistentNotifications(vi.fn(), {
        messageClient: { sendMessagePromise, subscribeMessage },
      })
    ).resolves.toBe(unsubscribe);
    expect(getConnectionMock).not.toHaveBeenCalled();
  });

  it('routes notification actions through the provider feature boundary', async () => {
    await integrationNotificationFeatureService.dismissPersistentNotification('disk');
    await integrationNotificationFeatureService.installUpdate('update.router');
    await integrationNotificationFeatureService.restartSystem();

    expect(dispatchServiceActionMock).toHaveBeenNthCalledWith(1, {
      domain: 'persistent_notification',
      service: 'dismiss',
      serviceData: {
        notification_id: 'disk',
      },
    });
    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'update.router',
      domain: 'update',
      service: 'install',
    });
    expect(dispatchServiceActionMock).toHaveBeenNthCalledWith(2, {
      domain: 'homeassistant',
      service: 'restart',
    });
  });

  it('rejects update installation for non-Home Assistant providers', () => {
    expect(() =>
      integrationNotificationFeatureService.installUpdate('homey:update.router')
    ).toThrow('Update installation is not supported for the current integration yet');
  });
});
