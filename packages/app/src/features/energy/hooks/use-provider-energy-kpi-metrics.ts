import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderSensorCollection } from '@navet/app/hooks/use-devices';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { SensorDevice } from '@navet/app/types/device.types';
import { useMemo } from 'react';
import type { EnergyProviderKpiMetric } from '../types/energy.types';

const ENERGY_DEVICE_CLASSES = new Set(['energy', 'power', 'monetary']);
const ENERGY_UNITS = new Set(['w', 'kw', 'mw', 'wh', 'kwh', 'mwh', 'gwh']);
const PREPAID_LABEL_PATTERN = /\b(prepaid|credit|balance|remaining|top[ -]?up)\b/i;
const ENERGY_LABEL_PATTERN = /\b(energy|electricity|tariff|meter)\b/i;

function isEnergyKpiSensor(sensor: { name: string; deviceClass?: string; unit?: string }) {
  const deviceClass = sensor.deviceClass?.trim().toLowerCase() ?? '';
  const unit = sensor.unit?.trim().toLowerCase() ?? '';
  return (
    ENERGY_DEVICE_CLASSES.has(deviceClass) ||
    ENERGY_UNITS.has(unit) ||
    PREPAID_LABEL_PATTERN.test(sensor.name) ||
    ENERGY_LABEL_PATTERN.test(sensor.name)
  );
}

function resolveMetricKind(sensor: {
  name: string;
  deviceClass?: string;
}): EnergyProviderKpiMetric['kind'] {
  if (PREPAID_LABEL_PATTERN.test(sensor.name)) return 'prepaid';
  if (sensor.deviceClass?.toLowerCase() === 'monetary') return 'cost';
  if (sensor.deviceClass?.toLowerCase() === 'power') return 'power';
  return 'energy';
}

export function useProviderEnergyKpiMetrics(): EnergyProviderKpiMetric[] {
  const providerId = useIntegrationStore(integrationSelectors.currentProviderId);
  const sensors = useProviderSensorCollection(providerId);

  return useMemo(() => buildProviderEnergyKpiMetrics(sensors), [sensors]);
}

export function buildProviderEnergyKpiMetrics(sensors: SensorDevice[]): EnergyProviderKpiMetric[] {
  return sensors
    .filter(isEnergyKpiSensor)
    .map((sensor) => {
      const sourceEntityId = sensor.canonicalId ?? sensor.id;
      return {
        id: `provider-metric:${sourceEntityId}`,
        sourceEntityId,
        label: sensor.name,
        value: sensor.value,
        unit: sensor.unit,
        kind: resolveMetricKind(sensor),
        availability: sensor.availability ?? 'unknown',
        room: sensor.room || undefined,
        lastUpdated: sensor.lastUpdated,
      } satisfies EnergyProviderKpiMetric;
    })
    .sort(
      (left, right) =>
        Number(right.kind === 'prepaid') - Number(left.kind === 'prepaid') ||
        left.label.localeCompare(right.label)
    );
}
