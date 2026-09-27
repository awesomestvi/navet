import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useNotificationActions } from './use-notification-actions';
import type { Notification } from './use-notifications';

const service = vi.hoisted(() => ({
  installUpdate: vi.fn(),
  dismissPersistentNotification: vi.fn(),
  restartSystem: vi.fn(),
}));
vi.mock('@navet/app/services/integration-notification-feature.service', () => ({
  integrationNotificationFeatureService: service,
}));

function useActions(notifications: Notification[]) {
  const [read, setReadNotifications] = useState<string[]>([]);
  const [hidden, setHiddenNotifications] = useState<string[]>([]);
  const [pending, setPendingUpdateInstalls] = useState<string[]>([]);
  return {
    read,
    hidden,
    pending,
    ...useNotificationActions({
      notifications,
      setReadNotifications,
      setHiddenNotifications,
      setPendingUpdateInstalls,
    }),
  };
}
const item: Notification = {
  id: 'persistent_notification:first',
  notificationId: 'first',
  source: 'persistent_notification',
  title: 'First',
  message: 'Notice',
  type: 'info',
  read: false,
  timestamp: new Date(),
};

describe('notification actions', () => {
  it('dismisses only the chosen provider ID and keeps other items visible locally', async () => {
    const { result } = renderHook(() =>
      useActions([
        item,
        { ...item, id: 'persistent_notification:second', notificationId: 'second' },
      ])
    );
    await act(() => result.current.deleteNotification(item.id));
    expect(result.current.hidden).toEqual([item.id]);
    expect(service.dismissPersistentNotification).toHaveBeenCalledExactlyOnceWith('first');
  });
  it('allows retry after an update request fails instead of leaving it installing', async () => {
    service.installUpdate.mockRejectedValueOnce(new Error('Connection lost'));
    const update: Notification = {
      ...item,
      id: 'update.controller',
      notificationId: 'update.controller',
      source: 'update',
    };
    const { result } = renderHook(() => useActions([update]));
    await act(async () => {
      await expect(result.current.runPrimaryAction(update.id)).rejects.toThrow('Connection lost');
    });
    expect(result.current.pending).toEqual([]);
    expect(result.current.read).toEqual([]);
    service.installUpdate.mockResolvedValueOnce(undefined);
    await act(() => result.current.runPrimaryAction(update.id));
    expect(result.current.pending).toEqual([update.id]);
  });
});
