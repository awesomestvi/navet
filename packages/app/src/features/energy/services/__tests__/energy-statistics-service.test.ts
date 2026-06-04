import type { Connection } from 'home-assistant-js-websocket';
import { describe, expect, it, vi } from 'vitest';
import { getEnergyStatisticsPeriods, getEnergyStatisticsToday } from '../energy-statistics-service';

function createConnection(response: unknown) {
  return {
    sendMessagePromise: vi.fn().mockResolvedValue(response),
  } as unknown as Connection;
}

describe('getEnergyStatisticsToday', () => {
  it('sums every returned change bucket for today', async () => {
    const connection = createConnection({
      'sensor.grid_import': [
        { start: '2026-05-24T00:00:00Z', change: 14 },
        { start: '2026-05-24T01:00:00Z', change: 0.89 },
      ],
    });

    await expect(
      getEnergyStatisticsToday(connection, { 'sensor.grid_import': 'kWh' })
    ).resolves.toEqual({
      'sensor.grid_import': 14.89,
    });
    expect(connection.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        period: '5minute',
        end_time: expect.any(String),
      })
    );
  });

  it('ignores invalid and negative changes', async () => {
    const connection = createConnection({
      'sensor.grid_import': [
        { start: '2026-05-24T00:00:00Z', change: 3 },
        { start: '2026-05-24T01:00:00Z', change: -2 },
        { start: '2026-05-24T02:00:00Z' },
      ],
    });

    await expect(
      getEnergyStatisticsToday(connection, { 'sensor.grid_import': 'kWh' })
    ).resolves.toEqual({
      'sensor.grid_import': 3,
    });
  });

  it('converts Wh statistics totals to kWh before returning them', async () => {
    const connection = createConnection({
      'sensor.grid_import': [
        { start: '2026-05-24T00:00:00Z', change: 14000 },
        { start: '2026-05-24T01:00:00Z', change: 890 },
      ],
    });

    await expect(
      getEnergyStatisticsToday(connection, { 'sensor.grid_import': 'Wh' })
    ).resolves.toEqual({
      'sensor.grid_import': 14.89,
    });
  });
});

describe('getEnergyStatisticsPeriods', () => {
  it('uses 5-minute buckets for today and daily buckets for longer ranges', async () => {
    const connection = {
      sendMessagePromise: vi
        .fn()
        .mockResolvedValueOnce({
          'sensor.grid_import': [
            { start: '2026-05-24T00:00:00Z', change: 14 },
            { start: '2026-05-24T01:00:00Z', change: 0.89 },
          ],
        })
        .mockResolvedValueOnce({
          'sensor.grid_import': [{ start: '2026-05-19T00:00:00Z', change: 52 }],
        })
        .mockResolvedValueOnce({
          'sensor.grid_import': [{ start: '2026-05-01T00:00:00Z', change: 201 }],
        }),
    } as unknown as Connection;

    await expect(
      getEnergyStatisticsPeriods(connection, 'sensor.grid_import', 'kWh')
    ).resolves.toEqual({ today: 14.89, week: 52, month: 201 });
    expect(connection.sendMessagePromise).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        period: '5minute',
        end_time: expect.any(String),
      })
    );
    expect(connection.sendMessagePromise).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ period: 'day' })
    );
    expect(connection.sendMessagePromise).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ period: 'day' })
    );
  });

  it('converts Wh period totals to kWh', async () => {
    const connection = {
      sendMessagePromise: vi
        .fn()
        .mockResolvedValueOnce({
          'sensor.grid_import': [
            { start: '2026-05-24T00:00:00Z', change: 14000 },
            { start: '2026-05-24T01:00:00Z', change: 890 },
          ],
        })
        .mockResolvedValueOnce({
          'sensor.grid_import': [{ start: '2026-05-19T00:00:00Z', change: 52000 }],
        })
        .mockResolvedValueOnce({
          'sensor.grid_import': [{ start: '2026-05-01T00:00:00Z', change: 201000 }],
        }),
    } as unknown as Connection;

    await expect(
      getEnergyStatisticsPeriods(connection, 'sensor.grid_import', 'Wh')
    ).resolves.toEqual({
      today: 14.89,
      week: 52,
      month: 201,
    });
  });
});
