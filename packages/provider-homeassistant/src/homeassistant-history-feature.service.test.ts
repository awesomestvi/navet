import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callHomeAssistantApiMock, getHomeAssistantConnectionMock } = vi.hoisted(() => ({
  callHomeAssistantApiMock: vi.fn(),
  getHomeAssistantConnectionMock: vi.fn(() => null),
}));

vi.mock('./homeassistant-service-bridge', () => ({
  callHomeAssistantApi: callHomeAssistantApiMock,
  getHomeAssistantConnection: getHomeAssistantConnectionMock,
}));

import { homeAssistantHistoryFeatureService } from './homeassistant-history-feature.service';

describe('homeAssistantHistoryFeatureService', () => {
  beforeEach(() => {
    callHomeAssistantApiMock.mockReset();
    getHomeAssistantConnectionMock.mockClear();
  });

  it('loads bounded entity history through the documented REST endpoint', async () => {
    callHomeAssistantApiMock.mockResolvedValueOnce([
      [
        {
          entity_id: 'binary_sensor.front_door',
          state: 'off',
          last_changed: '2026-07-14T08:00:00+00:00',
          last_updated: '2026-07-14T08:00:01+00:00',
        },
        {
          state: 'on',
          last_changed: '2026-07-14T08:30:00+00:00',
        },
      ],
    ]);

    await expect(
      homeAssistantHistoryFeatureService.getEntityHistory?.({
        entityId: 'binary_sensor.front_door',
        startTime: '2026-07-14T08:00:00+00:00',
        endTime: '2026-07-14T09:00:00+00:00',
      })
    ).resolves.toEqual({
      entityId: 'binary_sensor.front_door',
      points: [
        {
          state: 'off',
          changedAt: '2026-07-14T08:00:00+00:00',
          updatedAt: '2026-07-14T08:00:01+00:00',
        },
        {
          state: 'on',
          changedAt: '2026-07-14T08:30:00+00:00',
        },
      ],
    });

    const [method, path] = callHomeAssistantApiMock.mock.calls[0] as [string, string];
    expect(method).toBe('GET');
    expect(path).toContain('history/period/2026-07-14T08%3A00%3A00%2B00%3A00?');
    const query = new URLSearchParams(path.split('?')[1]);
    expect(query.get('filter_entity_id')).toBe('binary_sensor.front_door');
    expect(query.get('end_time')).toBe('2026-07-14T09:00:00+00:00');
    expect(query.has('minimal_response')).toBe(true);
    expect(query.has('no_attributes')).toBe(true);
  });

  it('preserves requested attributes and ignores malformed history rows', async () => {
    callHomeAssistantApiMock.mockResolvedValueOnce([
      [
        {
          entity_id: 'sensor.temperature',
          state: '21.4',
          last_changed: '2026-07-14T08:00:00Z',
          attributes: { unit_of_measurement: '°C' },
        },
        { state: 22, last_changed: '2026-07-14T08:05:00Z' },
        { state: '22', last_changed: 'not-a-date' },
      ],
    ]);

    const result = await homeAssistantHistoryFeatureService.getEntityHistory?.({
      entityId: 'sensor.temperature',
      startTime: '2026-07-14T08:00:00Z',
      endTime: '2026-07-14T09:00:00Z',
      includeAttributes: true,
      significantChangesOnly: true,
    });

    expect(result?.points).toEqual([
      {
        state: '21.4',
        changedAt: '2026-07-14T08:00:00Z',
        attributes: { unit_of_measurement: '°C' },
      },
    ]);
    const path = callHomeAssistantApiMock.mock.calls[0]?.[1] as string;
    const query = new URLSearchParams(path.split('?')[1]);
    expect(query.has('minimal_response')).toBe(false);
    expect(query.has('no_attributes')).toBe(false);
    expect(query.has('significant_changes_only')).toBe(true);
  });

  it('rejects invalid or reversed periods before making a request', async () => {
    await expect(
      homeAssistantHistoryFeatureService.getEntityHistory?.({
        entityId: 'sensor.temperature',
        startTime: '2026-07-14T10:00:00Z',
        endTime: '2026-07-14T09:00:00Z',
      })
    ).rejects.toThrow('valid start time before the end time');
    expect(callHomeAssistantApiMock).not.toHaveBeenCalled();
  });
});
