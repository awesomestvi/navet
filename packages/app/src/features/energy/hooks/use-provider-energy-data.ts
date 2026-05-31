import type { ProviderBatterySensorRow } from '@navet/app/features/dashboard/components/widgets/use-provider-battery-sensor-rows';
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
  isConfigured: false,
  isConnected: false,
  overview: createEmptyOverview(),
  periodTotals: { today: 0, week: 0, month: 0 },
  recentLoadTrend: [],
  todayTotalUsageKWh: 0,
};

export function useProviderEnergyData(range: EnergyRange): UseProviderEnergyDataResult {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = currentProviderId === 'home_assistant';
  const homeAssistantData = useHomeAssistantProviderEnergyData(range, isHomeAssistantProvider);

  if (!isHomeAssistantProvider) {
    return EMPTY_PROVIDER_ENERGY_DATA;
  }

  return homeAssistantData;
}
