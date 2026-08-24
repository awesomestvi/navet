import type { LockDevice } from '@navet/app/types/device.types';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSecurityActivityHistory } from './use-security-activity-history';

const getIntegrationEntityHistoriesMock = vi.hoisted(() => vi.fn());

vi.mock('@navet/app/services/integration-history.service', () => ({
  getIntegrationEntityHistories: getIntegrationEntityHistoriesMock,
}));

vi.mock('@navet/app/utils/visibility-aware-scheduler', () => ({
  subscribeVisibilityAwareAsyncTask: (task: () => Promise<void>) => {
    void task();
    return vi.fn();
  },
}));

function lock(state: boolean): LockDevice & { type: 'locks' } {
  return {
    id: 'lock.front_door',
    name: 'Front door',
    room: 'Entrance',
    size: 'small',
    state,
    securityKind: 'lock',
    securitySeverity: state ? 'normal' : 'warning',
    type: 'locks',
  };
}

describe('useSecurityActivityHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getIntegrationEntityHistoriesMock.mockReset();
  });

  it('appends older pages, keeps sparse activity loadable, and stops at the lookback limit', async () => {
    const nowMs = Date.parse('2026-08-24T12:00:00.000Z');
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    getIntegrationEntityHistoriesMock
      .mockResolvedValueOnce([
        {
          entityId: 'lock.front_door',
          points: [
            { state: 'locked', changedAt: '2026-08-24T09:00:00.000Z' },
            { state: 'unlocked', changedAt: '2026-08-24T10:00:00.000Z' },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          entityId: 'lock.front_door',
          points: [
            { state: 'locked', changedAt: '2026-08-20T08:00:00.000Z' },
            { state: 'unlocked', changedAt: '2026-08-20T09:00:00.000Z' },
            { state: 'locked', changedAt: '2026-08-20T10:00:00.000Z' },
          ],
        },
      ])
      .mockResolvedValue([{ entityId: 'lock.front_door', points: [] }]);

    const frontDoor = lock(false);
    const { result } = renderHook(() =>
      useSecurityActivityHistory({ entities: [frontDoor], currentActivity: [frontDoor] })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(result.current.events.map((event) => event.kind)).toEqual([
      'unlocked',
      'locked',
      'unlocked',
    ]);
    expect(getIntegrationEntityHistoriesMock.mock.calls[1]?.[0]).toMatchObject({
      entityIds: ['lock.front_door'],
      endTime: '2026-08-23T12:00:00.000Z',
      startTime: '2026-08-16T12:00:00.000Z',
    });

    await act(() => result.current.loadMore());
    expect(result.current.hasMore).toBe(true);
    await act(() => result.current.loadMore());
    await act(() => result.current.loadMore());
    await act(() => result.current.loadMore());
    expect(result.current.hasMore).toBe(false);
    expect(getIntegrationEntityHistoriesMock).toHaveBeenCalledTimes(6);
  });

  it('aborts the active batch when the activity surface unmounts', async () => {
    let requestSignal: AbortSignal | undefined;
    getIntegrationEntityHistoriesMock.mockImplementation(({ signal }: { signal?: AbortSignal }) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });

    const frontDoor = lock(false);
    const { unmount } = renderHook(() =>
      useSecurityActivityHistory({ entities: [frontDoor], currentActivity: [frontDoor] })
    );
    await waitFor(() => expect(requestSignal).toBeDefined());
    unmount();
    expect(requestSignal?.aborted).toBe(true);
  });

  it('caps retained and rendered history at the activity event budget', async () => {
    const nowMs = Date.parse('2026-08-24T12:00:00.000Z');
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);
    getIntegrationEntityHistoriesMock.mockResolvedValueOnce([
      {
        entityId: 'lock.front_door',
        points: Array.from({ length: 402 }, (_, index) => ({
          state: index % 2 === 0 ? 'locked' : 'unlocked',
          changedAt: new Date(nowMs - (402 - index) * 60_000).toISOString(),
        })),
      },
    ]);

    const frontDoor = lock(false);
    const { result } = renderHook(() =>
      useSecurityActivityHistory({ entities: [frontDoor], currentActivity: [frontDoor] })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toHaveLength(200);
    expect(result.current.hasMore).toBe(false);
  });
});
