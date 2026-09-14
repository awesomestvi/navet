import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@navet/app/constants';
import { useProviderHealth } from '@navet/app/hooks';
import { useDeviceCollectionsByKeys } from '@navet/app/hooks/use-devices';
import { getIntegrationEntityHistories } from '@navet/app/services/integration-history.service';
import type { SensorDevice } from '@navet/app/types/device.types';
import { subscribeVisibilityAwareAsyncTask } from '@navet/app/utils/visibility-aware-scheduler';
import type { PlatformEntityHistoryPoint } from '@navet/core/provider-feature-models';
import { useEffect, useMemo, useState } from 'react';
import { getCachedEnergyStatistics } from '../services/energy-statistics-cache';
import type { EnergyConsumer } from '../types/energy.types';

const COLLECTION_KEYS = ['sensors'] as const;

function numericValue(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function energyChangeKWh(points: PlatformEntityHistoryPoint[], unit: string): number {
  let previous: number | null = null;
  let total = 0;
  for (const point of [...points].sort(
    (a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt)
  )) {
    const value = numericValue(point.state);
    if (value === null || value < 0) continue;
    if (previous !== null) total += value >= previous ? value - previous : value;
    previous = value;
  }
  return total * (unit.toLowerCase() === 'wh' ? 0.001 : unit.toLowerCase() === 'mwh' ? 1000 : 1);
}

export function buildMeasuredEnergyConsumers(
  sensors: SensorDevice[],
  todayUsage: Record<string, number> = {}
): EnergyConsumer[] {
  const devices = new Map<string, { power?: SensorDevice; energy?: SensorDevice }>();
  for (const sensor of sensors) {
    if (sensor.providerId === 'home_assistant') continue;
    const unit = sensor.unit.trim().toLowerCase();
    const kind = ['w', 'kw', 'mw'].includes(unit)
      ? 'power'
      : ['wh', 'kwh', 'mwh'].includes(unit)
        ? 'energy'
        : null;
    if (!kind) continue;
    const key = sensor.sourceDeviceId ? `${sensor.providerId}:${sensor.sourceDeviceId}` : sensor.id;
    const device = devices.get(key) ?? {};
    // Separate additional meters instead of silently dropping a device's extra readings.
    if (device[kind]) devices.set(sensor.id, { [kind]: sensor });
    else {
      device[kind] = sensor;
      devices.set(key, device);
    }
  }
  return [...devices.values()].flatMap(({ power, energy }) => {
    const source = energy ?? power;
    if (!source) return [];
    const rawPower =
      power?.availability === 'unavailable' ? null : numericValue(power?.value ?? '');
    const powerUnit = power?.unit.toLowerCase();
    const powerW =
      (rawPower ?? 0) * (powerUnit === 'kw' ? 1000 : powerUnit === 'mw' ? 1_000_000 : 1);
    return [
      {
        id: source.canonicalId ?? source.id,
        name: source.sourceDeviceName ?? source.name,
        category: 'other' as const,
        powerEntityId: power?.canonicalId ?? power?.id,
        powerW,
        energyKWh: energy ? (todayUsage[energy.canonicalId ?? energy.id] ?? 0) : 0,
        shareOfLoad: 0,
        costToday: 0,
        status: powerW > 10 ? ('active' as const) : ('idle' as const),
        room: source.room,
      },
    ];
  });
}

export function useMeasuredDeviceEnergy() {
  const { sensors } = useDeviceCollectionsByKeys(COLLECTION_KEYS);
  const health = useProviderHealth();
  const [todayUsage, setTodayUsage] = useState<Record<string, number>>({});
  const meterIdentity = JSON.stringify(
    sensors
      .filter(
        (sensor) =>
          sensor.providerId !== 'home_assistant' &&
          ['wh', 'kwh', 'mwh'].includes(sensor.unit.toLowerCase())
      )
      .map((sensor) => [sensor.canonicalId ?? sensor.id, sensor.unit])
      .sort()
  );
  useEffect(() => {
    const meters = JSON.parse(meterIdentity) as [string, string][];
    if (!meters.length) return;
    let disposed = false;
    const unsubscribe = subscribeVisibilityAwareAsyncTask(
      async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const series = await getCachedEnergyStatistics(
          `measured-device-energy:${start.toISOString()}:${meterIdentity}`,
          ENERGY_STATISTICS_REFRESH_INTERVAL - 1000,
          () =>
            getIntegrationEntityHistories({
              entityIds: meters.map(([id]) => id),
              startTime: start.toISOString(),
            })
        );
        const units = new Map(meters);
        if (!disposed)
          setTodayUsage(
            Object.fromEntries(
              series.map((entry) => [
                entry.entityId,
                energyChangeKWh(entry.points, units.get(entry.entityId) ?? 'kWh'),
              ])
            )
          );
      },
      ENERGY_STATISTICS_REFRESH_INTERVAL,
      { runImmediately: true }
    );
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [meterIdentity]);
  const consumers = useMemo(
    () => buildMeasuredEnergyConsumers(sensors, todayUsage),
    [sensors, todayUsage]
  );
  return { consumers, isConnected: health.some((provider) => provider.connected) };
}
