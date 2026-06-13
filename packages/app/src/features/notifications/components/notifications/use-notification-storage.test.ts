import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTIFICATION_STORAGE_SYNC_EVENT,
  persistNotificationIds,
  useNotificationStorage,
} from './use-notification-storage';

vi.mock('./use-provider-update-candidates', () => ({
  useProviderUpdateCandidates: vi.fn(() => []),
}));

describe('useNotificationStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('dispatches same-tab sync events asynchronously after persisting', async () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    persistNotificationIds('navet-read-notifications', ['update.router']);

    expect(localStorage.getItem('navet-read-notifications')).toBe(
      JSON.stringify(['update.router'])
    );
    expect(dispatchEventSpy).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: NOTIFICATION_STORAGE_SYNC_EVENT })
      )
    );
  });

  it('syncs persisted values across hook instances', async () => {
    const { renderHookWithProviders } = await import('@navet/app/test/render');
    const first = renderHookWithProviders(() => useNotificationStorage());
    const second = renderHookWithProviders(() => useNotificationStorage());

    act(() => {
      first.result.current.setReadNotifications(['update.router']);
    });

    await waitFor(() => expect(second.result.current.readNotifications).toEqual(['update.router']));
  });
});
