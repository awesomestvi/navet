import { describe, expect, it } from 'vitest';
import type { EnergyConsumer } from '../../types/energy.types';
import {
  buildEnergyHistoryWorkspaceModel,
  resolveEnergyHistoryWindow,
} from '../energy-history-workspace';

const consumers: EnergyConsumer[] = [
  {
    id: 'kitchen-heater',
    name: 'Kitchen heater',
    category: 'other',
    powerEntityId: 'sensor.kitchen_power',
    powerW: 0,
    energyKWh: 0,
    shareOfLoad: 0,
    costToday: 0,
    status: 'idle',
    room: 'Kitchen',
  },
];

describe('energy history workspace', () => {
  it('uses the current calendar year with monthly buckets', () => {
    const window = resolveEnergyHistoryWindow({
      range: 'year',
      now: new Date('2026-08-20T14:00:00'),
    });
    expect(new Date(window.startMs).getMonth()).toBe(0);
    expect(new Date(window.startMs).getFullYear()).toBe(2026);
    expect(new Date(window.startMs).getDate()).toBe(1);
    expect(new Date(window.displayEndMs ?? 0)).toEqual(new Date(2027, 0, 1));
    expect(window.period).toBe('month');
  });

  it('uses complete day, week, and year boundaries for earlier periods', () => {
    const now = new Date(2026, 7, 20, 14, 30);
    const day = resolveEnergyHistoryWindow({
      range: 'today',
      now,
      referenceDate: new Date(2026, 7, 18),
    });
    const week = resolveEnergyHistoryWindow({
      range: 'week',
      now,
      referenceDate: new Date(2026, 7, 13),
    });
    const year = resolveEnergyHistoryWindow({
      range: 'year',
      now,
      referenceDate: new Date(2025, 5, 1),
    });

    expect(new Date(day.startMs)).toEqual(new Date(2026, 7, 18));
    expect(new Date(day.endMs)).toEqual(new Date(2026, 7, 19));
    expect(new Date(week.startMs)).toEqual(new Date(2026, 7, 7));
    expect(new Date(week.endMs)).toEqual(new Date(2026, 7, 14));
    expect(new Date(year.startMs)).toEqual(new Date(2025, 0, 1));
    expect(new Date(year.endMs)).toEqual(new Date(2026, 0, 1));
    expect(new Date(year.previousStartMs)).toEqual(new Date(2024, 0, 1));
    expect(new Date(year.previousEndMs)).toEqual(new Date(2025, 0, 1));
  });

  it('compares today with the same elapsed window yesterday', () => {
    const window = resolveEnergyHistoryWindow({
      range: 'today',
      now: new Date('2026-08-20T14:30:00'),
    });

    const previousStart = new Date(window.previousStartMs);
    const previousEnd = new Date(window.previousEndMs);
    expect(previousStart.getDate()).toBe(19);
    expect(previousStart.getHours()).toBe(0);
    expect(previousEnd.getDate()).toBe(19);
    expect(previousEnd.getHours()).toBe(14);
    expect(previousEnd.getMinutes()).toBe(30);
    expect(new Date(window.displayEndMs ?? 0)).toEqual(new Date(2026, 7, 21));
  });

  it('fills the Day view with one bucket for every calendar hour', () => {
    const dayStart = new Date(2026, 7, 20);
    const model = buildEnergyHistoryWorkspaceModel({
      wholeHomeEntityId: 'sensor.house_power',
      consumers: [],
      window: {
        startMs: dayStart.getTime(),
        endMs: new Date(2026, 7, 20, 10, 30).getTime(),
        displayEndMs: new Date(2026, 7, 21).getTime(),
        previousStartMs: new Date(2026, 7, 19).getTime(),
        previousEndMs: new Date(2026, 7, 19, 10, 30).getTime(),
        period: 'hour',
      },
      series: {
        'sensor.house_power': [
          {
            startMs: new Date(2026, 7, 20, 8).getTime(),
            endMs: new Date(2026, 7, 20, 9).getTime(),
            mean: 1000,
            min: 200,
            max: 1800,
          },
          {
            startMs: new Date(2026, 7, 20, 9).getTime(),
            endMs: new Date(2026, 7, 20, 10).getTime(),
            mean: 2000,
            min: 400,
            max: 3600,
          },
        ],
      },
    });

    expect(model.buckets).toHaveLength(24);
    expect(model.buckets[0]).toMatchObject({ energyKWh: 0, hasData: false });
    expect(model.buckets[8]).toMatchObject({ energyKWh: 1, hasData: true });
    expect(model.buckets[9]).toMatchObject({ energyKWh: 2, hasData: true });
    expect(model.buckets[23]).toMatchObject({ energyKWh: 0, hasData: false });
    expect(model.totalEnergyKWh).toBe(3);
  });

  it('uses the current calendar month while keeping the provider request bounded to now', () => {
    const now = new Date(2026, 7, 20, 14, 30);
    const window = resolveEnergyHistoryWindow({ range: 'month', now });

    expect(new Date(window.startMs)).toEqual(new Date(2026, 7, 1));
    expect(new Date(window.endMs)).toEqual(now);
    expect(new Date(window.displayEndMs ?? 0)).toEqual(new Date(2026, 8, 1));
    expect(new Date(window.previousStartMs)).toEqual(new Date(2026, 6, 1));
    expect(window.period).toBe('day');
  });

  it('uses complete calendar boundaries when viewing a previous month', () => {
    const window = resolveEnergyHistoryWindow({
      range: 'month',
      now: new Date(2026, 7, 20, 14, 30),
      referenceDate: new Date(2026, 5, 15),
    });

    expect(new Date(window.startMs)).toEqual(new Date(2026, 5, 1));
    expect(new Date(window.endMs)).toEqual(new Date(2026, 6, 1));
    expect(new Date(window.displayEndMs ?? 0)).toEqual(new Date(2026, 6, 1));
    expect(new Date(window.previousStartMs)).toEqual(new Date(2026, 4, 1));
    expect(new Date(window.previousEndMs)).toEqual(new Date(2026, 5, 1));
  });

  it('fills every day in a month without counting empty days as usage data', () => {
    const dayOne = new Date(2026, 7, 1);
    const dayTwo = new Date(2026, 7, 2);
    const dayThree = new Date(2026, 7, 3);
    const model = buildEnergyHistoryWorkspaceModel({
      wholeHomeEntityId: 'sensor.house_power',
      consumers: [],
      window: {
        startMs: dayOne.getTime(),
        endMs: new Date(2026, 7, 3, 14).getTime(),
        displayEndMs: new Date(2026, 8, 1).getTime(),
        previousStartMs: new Date(2026, 6, 1).getTime(),
        previousEndMs: new Date(2026, 6, 3, 14).getTime(),
        period: 'day',
      },
      series: {
        'sensor.house_power': [
          {
            startMs: dayOne.getTime(),
            endMs: dayTwo.getTime(),
            mean: 1000,
            min: 200,
            max: 1800,
          },
          {
            startMs: dayThree.getTime(),
            endMs: new Date(2026, 7, 4).getTime(),
            mean: 2000,
            min: 400,
            max: 3600,
          },
        ],
      },
    });

    expect(model.buckets).toHaveLength(31);
    expect(model.buckets[0]?.hasData).toBe(true);
    expect(model.buckets[1]).toMatchObject({ energyKWh: 0, hasData: false });
    expect(model.buckets[2]?.hasData).toBe(true);
    expect(model.buckets[30]).toMatchObject({ energyKWh: 0, hasData: false });
    expect(model.totalEnergyKWh).toBe(72);
    expect(model.lowPowerW).toBe(200);
    expect(model.peakPowerW).toBe(3600);
  });

  it('fills every month in a year without counting future months as usage data', () => {
    const model = buildEnergyHistoryWorkspaceModel({
      wholeHomeEntityId: 'sensor.house_power',
      consumers: [],
      window: {
        startMs: new Date(2026, 0, 1).getTime(),
        endMs: new Date(2026, 2, 20).getTime(),
        displayEndMs: new Date(2027, 0, 1).getTime(),
        previousStartMs: new Date(2025, 0, 1).getTime(),
        previousEndMs: new Date(2025, 2, 20).getTime(),
        period: 'month',
      },
      series: {
        'sensor.house_power': [
          {
            startMs: new Date(2026, 0, 1).getTime(),
            endMs: new Date(2026, 1, 1).getTime(),
            mean: 1000,
            min: 200,
            max: 1800,
          },
        ],
      },
    });

    expect(model.buckets).toHaveLength(12);
    expect(model.buckets[0]?.hasData).toBe(true);
    expect(model.buckets[11]).toMatchObject({ energyKWh: 0, hasData: false });
  });

  it('derives selected device and room attribution without inventing tracked usage', () => {
    const hour = 60 * 60 * 1000;
    const model = buildEnergyHistoryWorkspaceModel({
      wholeHomeEntityId: 'sensor.house_power',
      consumers,
      window: {
        startMs: 0,
        endMs: 2 * hour,
        previousStartMs: -2 * hour,
        previousEndMs: 0,
        period: 'hour',
      },
      selectedBucketIndex: 1,
      series: {
        'sensor.house_power': [
          { startMs: 0, endMs: hour, mean: 1000, min: 200, max: 1800 },
          { startMs: hour, endMs: 2 * hour, mean: 2000, min: 400, max: 3600 },
        ],
        'sensor.kitchen_power': [
          { startMs: 0, endMs: hour, mean: 250 },
          { startMs: hour, endMs: 2 * hour, mean: 500 },
        ],
      },
      previousSeries: {
        'sensor.house_power': [{ startMs: -2 * hour, endMs: 0, mean: 1000 }],
      },
    });

    expect(model.totalEnergyKWh).toBe(3);
    expect(model.peakPowerW).toBe(3600);
    expect(model.selectedBucket?.energyKWh).toBe(2);
    expect(model.deviceBreakdown[0]?.energyKWh).toBe(0.5);
    expect(model.roomBreakdown[0]?.name).toBe('Kitchen');
    expect(model.untrackedEnergyKWh).toBe(1.5);
    expect(model.comparisonPercent).toBeCloseTo(0.5);
  });

  it('uses cumulative energy change directly for grid and solar statistics', () => {
    const hour = 60 * 60 * 1000;
    const model = buildEnergyHistoryWorkspaceModel({
      wholeHomeEntityId: 'sensor.solar_energy',
      consumers: [],
      valueKind: 'energy',
      window: {
        startMs: 0,
        endMs: hour,
        previousStartMs: -hour,
        previousEndMs: 0,
        period: 'hour',
      },
      series: {
        'sensor.solar_energy': [{ startMs: 0, endMs: hour, change: 1.25, mean: 9042, max: 12000 }],
      },
    });

    expect(model.totalEnergyKWh).toBe(1.25);
    expect(model.averagePowerW).toBe(1250);
    expect(model.peakPowerW).toBe(1250);
  });
});
