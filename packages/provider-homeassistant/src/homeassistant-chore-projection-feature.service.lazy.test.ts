import type { ChoreProjectionSnapshot } from '@navet/core/chore-projection';
import { beforeEach, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ callWS: vi.fn() }));
vi.mock('./homeassistant-service-bridge', () => ({
  getHomeAssistantPanelHass: () => ({ callWS: session.callWS }),
  getHomeAssistantConnection: () => null,
}));

const { loaded, publishSnapshot, subscribeActionRequests, unsubscribe } = vi.hoisted(() => ({
  loaded: vi.fn(),
  publishSnapshot: vi.fn(),
  subscribeActionRequests: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('./homeassistant-chore-projection-feature.service', () => {
  loaded();
  return {
    homeAssistantChoreProjectionFeatureService: { publishSnapshot, subscribeActionRequests },
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  session.callWS = vi.fn();
  publishSnapshot.mockResolvedValue(undefined);
  subscribeActionRequests.mockResolvedValue(unsubscribe);
});

it('defers projection loading and preserves its snapshot, listener and unsubscribe', async () => {
  const { lazyHomeAssistantChoreProjectionFeatureService: proxy } = await import(
    './homeassistant-chore-projection-feature.service.lazy'
  );
  expect(loaded).not.toHaveBeenCalled();
  const snapshot: ChoreProjectionSnapshot = {
    contractVersion: 1,
    generatedAt: '2026-08-14T18:00:00.000Z',
    state: 'idle',
    counts: { dueNow: 0, overdue: 0, awaitingApproval: 0, completedToday: 0 },
    next: [],
    services: ['claim', 'complete', 'approve', 'reject', 'skip', 'reopen', 'reassign'],
  };
  await proxy.publishSnapshot(snapshot);
  expect(publishSnapshot).toHaveBeenCalledWith(snapshot);
  const listener = vi.fn();
  const dispose = await proxy.subscribeActionRequests?.(listener);
  expect(subscribeActionRequests).toHaveBeenCalledWith(listener);
  dispose?.();
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(loaded).toHaveBeenCalledTimes(1);
});

it('preserves projection transport failures', async () => {
  const { lazyHomeAssistantChoreProjectionFeatureService: proxy } = await import(
    './homeassistant-chore-projection-feature.service.lazy'
  );
  const error = new Error('Projection unavailable');
  subscribeActionRequests.mockRejectedValueOnce(error);
  await expect(proxy.subscribeActionRequests?.(vi.fn())).rejects.toBe(error);
});

it('rejects a chore snapshot if its household changes while loading', async () => {
  const { lazyHomeAssistantChoreProjectionFeatureService: proxy } = await import(
    './homeassistant-chore-projection-feature.service.lazy'
  );
  const pending = proxy.publishSnapshot({
    contractVersion: 1,
    generatedAt: '2026-08-14T18:00:00.000Z',
    state: 'idle',
    counts: { dueNow: 0, overdue: 0, awaitingApproval: 0, completedToday: 0 },
    next: [],
    services: ['claim', 'complete', 'approve', 'reject', 'skip', 'reopen', 'reassign'],
  });
  session.callWS = vi.fn();
  await expect(pending).rejects.toThrow('Home Assistant session changed');
  expect(publishSnapshot).not.toHaveBeenCalled();
});
