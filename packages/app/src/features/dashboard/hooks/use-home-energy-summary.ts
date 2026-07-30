import { resolveTodayEnergyKWh } from '@navet/app/features/energy/hooks/use-energy-ha-data';
import { useEnergyStatisticsToday } from '@navet/app/features/energy/hooks/use-energy-statistics-today';
import type { EnergySourceConfig } from '@navet/app/features/energy/types/energy.types';
import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderEntitySnapshotRecord } from '@navet/app/hooks/use-provider-entity';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { getIntegrationHistoryMessageClient } from '@navet/app/services/integration-history.service';
import { integrationSelectors, providerRuntimeSelectors } from '@navet/app/stores/selectors';
import { useEffect, useMemo, useState } from 'react';

interface HomeEnergySummary {
  gridImportTodayKWh?: number;
  isConfigured: boolean;
}

function hasEnergySourceConfig(config: EnergySourceConfig | null): config is EnergySourceConfig {
  return Boolean(
    config &&
      (config.solarEnergyEntityId ||
        config.gridImportEnergyEntityId ||
        config.gridExportEnergyEntityId ||
        config.gasEnergyEntityId ||
        config.hotWaterEnergyEntityId ||
        config.devices.length > 0)
  );
}

function isMissingEnergyPreferences(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'not_found' && message === 'No prefs';
}

/**
 * Fetches only the source and statistic needed by the Home summary pill. The full Energy dashboard
 * hook also subscribes to every entity, battery devices, load history, and several statistic
 * periods; mounting that pipeline on Home makes unrelated entity ticks unnecessarily expensive.
 */
export function useHomeEnergySummary(): HomeEnergySummary {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const currentProviderRuntime = useIntegrationStore(
    providerRuntimeSelectors.currentProviderRuntime
  );
  const enabled =
    currentProviderId === 'home_assistant' && currentProviderRuntime.connected === true;
  const [sourceConfig, setSourceConfig] = useState<EnergySourceConfig | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSourceConfig(null);
      return;
    }

    let cancelled = false;

    async function loadSourceConfig() {
      const messageClient = getIntegrationHistoryMessageClient('home_assistant');
      const energyFeatureService =
        getProviderRuntimeRegistration('home_assistant').energyFeatureService;
      if (!messageClient || !energyFeatureService) {
        if (!cancelled) {
          setSourceConfig(null);
        }
        return;
      }

      try {
        const nextSourceConfig = await energyFeatureService.getSourceConfig(messageClient);
        if (!cancelled) {
          setSourceConfig(nextSourceConfig);
        }
      } catch (error) {
        if (!isMissingEnergyPreferences(error)) {
          console.error('[HomeEnergySummary] Failed to load energy source config:', error);
        }
        if (!cancelled) {
          setSourceConfig(null);
        }
      }
    }

    void loadSourceConfig();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const gridImportEntityId = sourceConfig?.gridImportEnergyEntityId;
  const gridImportEntityIds = useMemo(
    () => (gridImportEntityId ? [gridImportEntityId] : []),
    [gridImportEntityId]
  );
  const entitySnapshots = useProviderEntitySnapshotRecord(gridImportEntityIds, {
    enabled: enabled && Boolean(gridImportEntityId),
    providerId: 'home_assistant',
  });
  const gridImportEntity = gridImportEntityId ? entitySnapshots[gridImportEntityId] : undefined;
  const gridImportUnit =
    typeof gridImportEntity?.attributes.unit_of_measurement === 'string'
      ? gridImportEntity.attributes.unit_of_measurement
      : typeof gridImportEntity?.attributes.native_unit_of_measurement === 'string'
        ? gridImportEntity.attributes.native_unit_of_measurement
        : undefined;
  const energyStatisticUnits = useMemo(
    () => (gridImportEntityId ? { [gridImportEntityId]: gridImportUnit } : {}),
    [gridImportEntityId, gridImportUnit]
  );
  const todayStatistics = useEnergyStatisticsToday(
    energyStatisticUnits,
    enabled && Boolean(gridImportEntityId)
  );
  const isConfigured = hasEnergySourceConfig(sourceConfig);
  const gridImportTodayKWh =
    isConfigured && gridImportEntityId
      ? resolveTodayEnergyKWh(
          gridImportEntity
            ? {
                [gridImportEntityId]: {
                  entity_id: gridImportEntityId,
                  state: gridImportEntity.state,
                  attributes: gridImportEntity.attributes,
                },
              }
            : null,
          gridImportEntityId,
          todayStatistics.values[gridImportEntityId]
        )
      : undefined;

  return useMemo(
    () => ({
      isConfigured,
      gridImportTodayKWh,
    }),
    [gridImportTodayKWh, isConfigured]
  );
}
