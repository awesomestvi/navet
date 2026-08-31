import type { HomeEvent } from '@navet/core/home-events';
import { describe, expect, it, vi } from 'vitest';
import type { NavetAiEventBatch } from './navet-ai.contract';
import {
  coalesceHourlyPowerEvent,
  isNavetAiBackfillReady,
  loadNavetAiBackfillHistories,
  selectHourlyMaximumPowerPoints,
  splitNavetAiBackfillEvents,
  uploadNavetAiBackfill,
} from './navet-ai-engine';

function event(index: number, state: HomeEvent['currentState'] = 'on'): HomeEvent {
  return {
    id: `event-${index}`,
    providerId: 'home_assistant',
    entityId: `light.test_${index}`,
    canonicalEntityId: `home_assistant:light.test_${index}`,
    domain: 'light',
    action: 'turned_on',
    source: 'unknown',
    timestamp: '2026-08-30T12:00:00.000Z',
    currentState: state,
    context: { currentState: state },
  };
}

describe('Navet AI history backfill', () => {
  it('reduces frequent power history to one maximum reading per hour', () => {
    const points = [
      { state: '320', changedAt: '2026-08-30T12:05:00.000Z' },
      { state: '1850', changedAt: '2026-08-30T12:35:00.000Z' },
      { state: '900', changedAt: '2026-08-30T12:55:00.000Z' },
      { state: '410', changedAt: '2026-08-30T13:10:00.000Z' },
    ];

    expect(selectHourlyMaximumPowerPoints(points)).toEqual([points[1], points[3]]);
  });

  it('coalesces live power updates to one maximum event per sensor and hour', () => {
    const first = event(1, 320);
    const spike = { ...event(2, 1850), timestamp: '2026-08-30T12:35:00.000Z' };
    const nextHour = { ...event(3, 410), timestamp: '2026-08-30T13:10:00.000Z' };

    const initial = coalesceHourlyPowerEvent(undefined, first);
    const coalesced = coalesceHourlyPowerEvent(initial.pending, spike);
    const rolledOver = coalesceHourlyPowerEvent(coalesced.pending, nextHour);

    expect(coalesced.completed).toBeUndefined();
    expect(coalesced.pending.event.currentState).toBe(1850);
    expect(rolledOver.completed?.currentState).toBe(1850);
    expect(rolledOver.pending.event.currentState).toBe(410);
  });

  it('does not immediately retry a failed backfill on every provider update', () => {
    const now = Date.parse('2026-08-30T12:00:00.000Z');

    expect(isNavetAiBackfillReady({ inProgress: false, retryAfter: now + 300_000, now })).toBe(
      false
    );
    expect(
      isNavetAiBackfillReady({ inProgress: false, retryAfter: now + 300_000, now: now + 300_000 })
    ).toBe(true);
    expect(
      isNavetAiBackfillReady({
        inProgress: false,
        completedAt: '2026-08-30T11:59:00.000Z',
        retryAfter: 0,
        now,
      })
    ).toBe(false);
  });

  it('loads provider history in small sequential entity batches', async () => {
    const activeCalls = { current: 0, maximum: 0 };
    const loadHistories = vi.fn(async ({ entityIds }: { entityIds: string[] }) => {
      activeCalls.current += 1;
      activeCalls.maximum = Math.max(activeCalls.maximum, activeCalls.current);
      await Promise.resolve();
      activeCalls.current -= 1;
      return entityIds.map((entityId) => ({ entityId, points: [] }));
    });
    const entityIds = Array.from({ length: 12 }, (_, index) => `home_assistant:light.${index}`);

    const histories = await loadNavetAiBackfillHistories(
      entityIds,
      '2026-07-31T12:00:00.000Z',
      loadHistories
    );

    expect(loadHistories.mock.calls.map(([request]) => request.entityIds.length)).toEqual([
      5, 5, 2,
    ]);
    expect(activeCalls.maximum).toBe(1);
    expect(histories.map((series) => series.entityId)).toEqual(entityIds);
  });

  it('keeps every event upload below both the count and encoded-size limits', () => {
    const events = Array.from({ length: 11 }, (_, index) => event(index, 'x'.repeat(900)));
    const batches = splitNavetAiBackfillEvents(events, { maxEvents: 4, maxBytes: 2_800 });

    expect(batches.flat()).toEqual(events);
    expect(batches.length).toBeGreaterThan(3);
    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(4);
      expect(
        new TextEncoder().encode(JSON.stringify({ events: batch })).byteLength
      ).toBeLessThanOrEqual(2_800);
    }
  });

  it('marks the backfill complete only after every bounded event batch succeeds', async () => {
    const append = vi.fn(async (_batch: NavetAiEventBatch) => undefined);
    const events = Array.from({ length: 401 }, (_, index) => event(index));

    await uploadNavetAiBackfill(events, append);

    expect(append).toHaveBeenCalledTimes(4);
    expect(append.mock.calls.slice(0, -1).map(([batch]) => batch.events.length)).toEqual([
      200, 200, 1,
    ]);
    expect(append.mock.calls.at(-1)?.[0]).toEqual({ events: [], backfillComplete: true });
  });

  it('does not send the completion marker when an event batch fails', async () => {
    const append = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('request_too_large'));

    await expect(
      uploadNavetAiBackfill(
        Array.from({ length: 201 }, (_, index) => event(index)),
        append
      )
    ).rejects.toThrow('request_too_large');

    expect(append).toHaveBeenCalledTimes(2);
    expect(append).not.toHaveBeenCalledWith({ events: [], backfillComplete: true });
  });
});
