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
import { useProviderNotificationSnapshot } from './use-provider-notification-snapshot';

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
