import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessagePromise = vi.fn();
const subscribeMessage = vi.fn();

vi.mock('./homeassistant-service-bridge', () => ({
  getHomeAssistantConnection: () => ({ sendMessagePromise, subscribeMessage }),
}));

import { homeAssistantChoreProjectionFeatureService } from './homeassistant-chore-projection-feature.service';

describe('homeAssistantChoreProjectionFeatureService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes the provider-neutral snapshot as one Home Assistant event', async () => {
    sendMessagePromise.mockResolvedValue({});
    await homeAssistantChoreProjectionFeatureService.publishSnapshot({
      contractVersion: 1,
      generatedAt: '2026-08-14T18:00:00.000Z',
      state: 'idle',
      counts: { dueNow: 0, overdue: 0, awaitingApproval: 0, completedToday: 0 },
      next: [],
      services: ['claim', 'complete', 'approve', 'reject', 'skip', 'reopen', 'reassign'],
    });
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'fire_event',
      event_type: 'navet_chore_projection',
      event_data: expect.objectContaining({ contractVersion: 1, state: 'idle' }),
    });
  });

  it('normalizes Home Assistant service requests before exposing them to Navet', async () => {
    const dispose = vi.fn();
    subscribeMessage.mockImplementation(async (listener) => {
      listener({
        data: {
          action: 'reassign',
          occurrenceId: 'occurrence-1',
          participantId: 'manager',
          assigneeIds: ['alex', 42],
          reason: 'Balance the week',
        },
      });
      return dispose;
    });
    const listener = vi.fn();

    await expect(
      homeAssistantChoreProjectionFeatureService.subscribeActionRequests?.(listener)
    ).resolves.toBe(dispose);
    expect(subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
      type: 'subscribe_events',
      event_type: 'navet_chore_action_requested',
    });
    expect(listener).toHaveBeenCalledWith({
      action: 'reassign',
      occurrenceId: 'occurrence-1',
      participantId: 'manager',
      assigneeIds: ['alex'],
      reason: 'Balance the week',
    });
  });
});
