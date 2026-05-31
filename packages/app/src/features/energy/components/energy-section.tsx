import { DashboardEmptyState } from '@navet/app/components/patterns';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useIntegrationStore, useTheme } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { INTEGRATION_PROVIDERS } from '@navet/app/types/provider';
import { Zap } from 'lucide-react';
import { memo } from 'react';
import { useEnergyDashboard } from '../hooks/use-energy-dashboard';
import { EnergyDashboardPage } from './dashboard/energy-dashboard-page';

export const EnergySection = memo(function EnergySection() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const providerLabel = INTEGRATION_PROVIDERS[currentProviderId].label;
  const {
    dashboard,
    energySourceDiagnostics,
    hasEnergyStatisticsLoaded,
    range,
    setRange,
    isConnected,
    isConfigured,
    selectedNode,
    setSelectedNodeId,
  } = useEnergyDashboard();

  if (!isConnected) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Zap}
          title={t('network.disconnectedTitle', { provider: providerLabel })}
          description={t('network.disconnectedDescription', { provider: providerLabel })}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Zap}
          title={t('energy.setup.panelTitle')}
          description={t('energy.setup.panelDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  if (!hasEnergyStatisticsLoaded) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Zap}
          title={t('energy.sourcesFound.title')}
          description={t('energy.sourcesFound.description')}
          className="w-full max-w-2xl"
        >
          {energySourceDiagnostics.length > 0 ? (
            <div className="grid max-h-56 gap-2 overflow-auto text-left">
              {energySourceDiagnostics.slice(0, 8).map((source) => (
                <div
                  key={`${source.label}:${source.entityId}`}
                  className={`rounded-2xl border px-3 py-2 ${surface.border} ${surface.subtleBg}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs font-semibold ${surface.textSecondary}`}>
                      {source.label}
                    </div>
                    <div className={`text-xs ${surface.textMuted}`}>
                      {source.status === 'configured_unavailable'
                        ? 'Unavailable'
                        : source.status === 'configured_idle'
                          ? 'Idle'
                          : 'Available'}
                    </div>
                  </div>
                  <div className={`truncate text-xs ${surface.textMuted}`}>
                    {source.entityId ?? source.liveEntityId}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </DashboardEmptyState>
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
      sourceDiagnostics={energySourceDiagnostics}
    />
  );
});
