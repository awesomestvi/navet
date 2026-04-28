import { Settings, Zap } from 'lucide-react';
import { memo } from 'react';
import { DashboardEmptyState } from '@/app/components/patterns';
import { useI18n } from '@/app/hooks';
import { useEnergyDashboard } from '../hooks/use-energy-dashboard';
import { EnergyDashboardPage } from './dashboard/energy-dashboard-page';
import { EnergySetupWizard } from './energy-setup-wizard';

export const EnergySection = memo(function EnergySection() {
  const { t } = useI18n();
  const {
    dashboard,
    range,
    setRange,
    isConnected,
    isConfigured,
    sourceConfig,
    showSetup,
    openSetup,
    closeSetup,
    handleSaveConfig,
    selectedNode,
    setSelectedNodeId,
  } = useEnergyDashboard();

  if (!isConnected && !showSetup) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Zap}
          title={t('network.disconnectedTitle')}
          description={t('network.disconnectedDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  if (!isConfigured || showSetup) {
    return (
      <div className="space-y-6">
        {!isConfigured && !showSetup ? (
          <div className="flex h-full items-center justify-center p-6">
            <DashboardEmptyState
              icon={Zap}
              title={t('energy.setup.panelTitle')}
              description={t('energy.setup.panelDescription')}
              actionIcon={Settings}
              actionLabel={t('energy.demo.connect')}
              onAction={openSetup}
              className="w-full max-w-md"
            />
          </div>
        ) : null}

        {showSetup || !isConfigured ? (
          <EnergySetupWizard
            initialConfig={sourceConfig ?? undefined}
            onSave={handleSaveConfig}
            onCancel={showSetup ? closeSetup : undefined}
          />
        ) : null}
      </div>
    );
  }

  return (
    <EnergyDashboardPage
      dashboard={dashboard}
      range={range}
      onRangeChange={setRange}
      selectedNodeId={selectedNode?.id ?? null}
      onNodeSelect={setSelectedNodeId}
      onOpenSetup={openSetup}
    />
  );
});
