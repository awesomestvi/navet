import { EnergyDashboardPage } from '@navet/app/features/energy/components/dashboard/energy-dashboard-page';
import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import { useEditModeStore } from '@navet/app/stores/edit-mode-store';
import { demoEnergyHistorySources, loadDemoEnergyHistory } from './demo-energy-history';

const demoEnergyScenario = getEnergyDashboardScenario('default');
const demoEnergySourceDiagnostics = getMockEnergySourceDiagnostics(demoEnergyScenario.dashboard);

export function DemoEnergySection() {
  const isEditMode = useEditModeStore((state) => state.isEditMode);

  return (
    <EnergyDashboardPage
      dashboard={demoEnergyScenario.dashboard}
      sourceDiagnostics={demoEnergySourceDiagnostics}
      isEditMode={isEditMode}
      currentLoadStatisticId="sensor.whole_home_power"
      historyStatisticsLoader={loadDemoEnergyHistory}
      historySources={demoEnergyHistorySources}
    />
  );
}
