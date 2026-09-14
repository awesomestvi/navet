import type { ProviderBatterySensorRow } from '@navet/app/hooks';
import { useIntegrationStore } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type {
  EnergyOverview,
  EnergyRange,
  EnergySeriesPoint,
  EnergySourceConfig,
  EnergySourceDiagnostic,
} from '../types/energy.types';
import { useHomeAssistantProviderEnergyData } from './use-home-assistant-provider-energy-data';
import { useMeasuredDeviceEnergy } from './use-measured-device-energy';

interface EnergyPeriodTotals {
  today: number;
  week: number;
  month: number;
}

function createEmptyOverview(): EnergyOverview {
  return {
    liveStats: [],
    flow: [],
    trend: [],
    topConsumers: [],
    insights: [],
    totals: {
      currentLoadW: 0,
      solarW: 0,
      batteryPercent: 0,
      importW: 0,
      exportW: 0,
      importTodayKWh: 0,
      solarTodayKWh: 0,
      gasTodayKWh: 0,
      hotWaterTodayKWh: 0,
      costToday: 0,
      projectedMonthCost: 0,
    },
    nodes: [],
  };
}

export interface UseProviderEnergyDataResult {
  batteryDevices: ProviderBatterySensorRow[];
  currentLoadStatisticId?: string;
  energySourceDiagnostics: EnergySourceDiagnostic[];
  haSourceConfig: EnergySourceConfig | null;
  hasEnergyStatisticsLoaded: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  overview: EnergyOverview;
  periodTotals: EnergyPeriodTotals;
  recentLoadTrend: EnergySeriesPoint[];
  todayTotalUsageKWh: number;
}

const EMPTY_PROVIDER_ENERGY_DATA: UseProviderEnergyDataResult = {
  batteryDevices: [],
  currentLoadStatisticId: undefined,
  energySourceDiagnostics: [],
  haSourceConfig: null,
  hasEnergyStatisticsLoaded: false,
  isLoading: false,
  isConfigured: false,
  isConnected: false,
  overview: createEmptyOverview(),
  periodTotals: { today: 0, week: 0, month: 0 },
  recentLoadTrend: [],
  todayTotalUsageKWh: 0,
};

export function useProviderEnergyData(range: EnergyRange): UseProviderEnergyDataResult {
  const selectedProviderIds = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const isHomeAssistantProvider = selectedProviderIds.includes('home_assistant');
  const homeAssistantData = useHomeAssistantProviderEnergyData(range, isHomeAssistantProvider);
  const measured = useMeasuredDeviceEnergy();
  const base = isHomeAssistantProvider ? homeAssistantData : EMPTY_PROVIDER_ENERGY_DATA;
  if (!measured.consumers.length) return base;
  const consumers = [...base.overview.topConsumers, ...measured.consumers];
  // Imported meters can include both household totals and individual loads.
  // Keep whole-home totals tied to their configured source rather than summing overlapping meters.
  const loadW = base.overview.totals.currentLoadW;
  return {
    ...base,
    isConnected: base.isConnected || measured.isConnected,
    isConfigured: true,
    hasEnergyStatisticsLoaded: true,
    overview: {
      ...base.overview,
      totals: { ...base.overview.totals, currentLoadW: loadW },
      topConsumers: consumers.map((device) => ({
        ...device,
        shareOfLoad: loadW > 0 ? device.powerW / loadW : 0,
      })),
    },
  };
}
