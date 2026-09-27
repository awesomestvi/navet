import { integrationStore } from '@navet/app/stores/integration-store';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
  home_assistant: { getSnapshot: vi.fn(), subscribePersistentNotifications: vi.fn() },
  homey: { getSnapshot: vi.fn(), subscribePersistentNotifications: vi.fn() },
}));
vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: (id: keyof typeof services) => ({
    notificationFeatureService: services[id],
  }),
}));

import {
  applyNotificationEvent,
  useProviderNotificationSnapshot,
} from './use-provider-notification-snapshot';

describe('shared provider notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('combines connected providers regardless of the current session and cleans up disconnected sources', async () => {
    const state = integrationStore.getState();
    integrationStore.setState({
      currentProviderId: 'homey',
      selectedProviderIds: ['homey', 'home_assistant'],
      providerHealth: {
        ...state.providerHealth,
        homey: { ...state.providerHealth.homey, connected: true },
        home_assistant: { ...state.providerHealth.home_assistant, connected: true },
      },
    });
    const cleanupHa = vi.fn(),
      cleanupHomey = vi.fn();
    services.home_assistant.getSnapshot.mockResolvedValue({
      persistentNotifications: [{ notification_id: 'ha', message: 'Backup complete' }],
      repairIssues: [],
    });
    services.homey.getSnapshot.mockResolvedValue({
      persistentNotifications: [{ notification_id: 'homey:notice', message: 'Door open' }],
      repairIssues: [],
    });
    services.home_assistant.subscribePersistentNotifications.mockResolvedValue(cleanupHa);
    services.homey.subscribePersistentNotifications.mockResolvedValue(cleanupHomey);
    const { result, unmount } = renderHook(() => useProviderNotificationSnapshot());
    await waitFor(() => expect(result.current.persistentNotifications).toHaveLength(2));
    expect(result.current.persistentNotifications.map((item) => item.notification_id)).toEqual(
      expect.arrayContaining(['ha', 'homey:notice'])
    );
    act(() => integrationStore.setState({ selectedProviderIds: ['home_assistant'] }));
    await waitFor(() =>
      expect(result.current.persistentNotifications).toEqual([
        { notification_id: 'ha', message: 'Backup complete' },
      ])
    );
    expect(cleanupHomey).toHaveBeenCalledTimes(1);
    unmount();
    expect(cleanupHa).toHaveBeenCalledTimes(2);
  });
});

// Keep the aggregation coverage above; these regressions exercise partial provider events.
describe('notification event updates', () => {
  const first = { notification_id: 'first', message: 'Door open' };
  const second = { notification_id: 'second', message: 'Backup complete' };
  it('removes only the dismissed notification', () => {
    expect(
      applyNotificationEvent([first, second], { update_type: 'removed', notifications: [first] })
    ).toEqual([second]);
  });
  it('keeps existing notifications when a new one arrives', () => {
    expect(
      applyNotificationEvent([first], { update_type: 'added', notifications: [second] })
    ).toEqual([first, second]);
  });
  it('updates only the matching item without duplicating it', () => {
    const changed = { ...first, message: 'Door closed' };
    expect(
      applyNotificationEvent([first, second], { update_type: 'updated', notifications: [changed] })
    ).toEqual([second, changed]);
  });
  it('accepts an empty current snapshot and bulk removal', () => {
    expect(
      applyNotificationEvent([first, second], { update_type: 'current', notifications: [] })
    ).toEqual([]);
    expect(
      applyNotificationEvent([first, second], {
        update_type: 'removed',
        notifications: [first, second],
      })
    ).toEqual([]);
  });
  it('replays events over an initial snapshot that resolves later', async () => {
    const state = integrationStore.getState();
    integrationStore.setState({
      selectedProviderIds: ['home_assistant'],
      providerHealth: {
        ...state.providerHealth,
        home_assistant: { ...state.providerHealth.home_assistant, connected: true },
      },
    });
    let resolveSnapshot!: (value: unknown) => void;
    services.home_assistant.getSnapshot.mockReturnValue(
      new Promise((resolve) => {
        resolveSnapshot = resolve;
      })
    );
    services.home_assistant.subscribePersistentNotifications.mockImplementation(
      async (callback) => {
        callback({ update_type: 'removed', notifications: [first] });
        return () => {};
      }
    );
    const { result, unmount } = renderHook(() => useProviderNotificationSnapshot());
    await act(async () => {
      resolveSnapshot({
        persistentNotifications: [first, second],
        repairIssues: [{ issue_id: 'repair' }],
      });
    });
    expect(result.current.persistentNotifications).toEqual([second]);
    expect(result.current.repairIssues).toEqual([{ issue_id: 'repair' }]);
    unmount();
  });
});
