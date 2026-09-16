import type { EnergyHistorySource } from '@navet/app/features/energy/types/energy.types';
import type {
  PlatformStatisticsHistoryRequest,
  PlatformStatisticsHistorySeries,
} from '@navet/core/provider-feature-models';

export const demoEnergyHistorySources: EnergyHistorySource[] = [
  {
    id: 'home',
    label: 'Home use',
    entityId: 'sensor.whole_home_power',
    color: '#f97316',
    valueKind: 'power',
  },
  {
    id: 'grid',
    label: 'Grid import',
    entityId: 'sensor.grid_import_power',
    color: '#60a5fa',
    valueKind: 'power',
  },
  {
    id: 'solar',
    label: 'Solar production',
    entityId: 'sensor.solar_power',
    color: '#facc15',
    valueKind: 'power',
  },
];

const basePowerW: Record<string, number> = {
  'sensor.hvac_power': 620,
  'sensor.water_heater_power': 340,
  'sensor.ev_power': 280,
  'sensor.kitchen_power': 210,
  'sensor.floor_heating_power': 180,
  'sensor.laundry_power': 120,
};

/** Sample statistics only: stable across refreshes and independent of request ordering. */
export async function loadDemoEnergyHistory(
  request: PlatformStatisticsHistoryRequest
): Promise<PlatformStatisticsHistorySeries> {
  const startMs = Date.parse(request.startTime);
  const endMs = Math.min(request.endTime ? Date.parse(request.endTime) : Date.now(), Date.now());
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return {};

  const starts: number[] = [];
  for (let cursor = startMs; cursor < endMs; ) {
    starts.push(cursor);
    const next = new Date(cursor);
    if (request.period === 'month') next.setMonth(next.getMonth() + 1);
    else if (request.period === 'year') next.setFullYear(next.getFullYear() + 1);
    else if (request.period === 'day') next.setDate(next.getDate() + 1);
    else if (request.period === 'week') next.setDate(next.getDate() + 7);
    else next.setTime(cursor + (request.period === '5minute' ? 5 : 60) * 60_000);
    cursor = next.getTime();
  }

  return Object.fromEntries(
    request.entityIds.map((entityId) => [
      entityId,
      starts.map((pointStart, index) => {
        const date = new Date(pointStart);
        const hour = date.getHours() + date.getMinutes() / 60;
        const isDailyAggregate = !['5minute', 'hour'].includes(request.period);
        const daylight = isDailyAggregate
          ? 0.32
          : Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
        const dailyVariation = 1 + Math.sin(date.getTime() / 86_400_000) * 0.12;
        const demand = (1 + Math.sin((hour / 24) * Math.PI * 4) * 0.25) * dailyVariation;
        const homeW = 2400 * demand;
        const solarW = 3200 * daylight * dailyVariation;
        const mean =
          entityId === 'sensor.whole_home_power'
            ? homeW
            : entityId === 'sensor.solar_power'
              ? solarW
              : entityId === 'sensor.grid_import_power'
                ? Math.max(0, homeW - solarW)
                : (basePowerW[entityId] ?? 80) * demand;
        return {
          startMs: pointStart,
          endMs: starts[index + 1] ?? endMs,
          mean,
          min: mean * 0.8,
          max: mean * 1.2,
        };
      }),
    ])
  );
}
