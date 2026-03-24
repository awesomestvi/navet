import { Settings } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { DashboardHeroSection } from '../../dashboard/components/dashboard-hero-section';
import { useEnergyDashboard } from '../hooks/use-energy-dashboard';
import type { EnergyRange, EnergyWidgetId } from '../types/energy.types';
import { EnergySetupPanel } from './energy-setup-panel';
import { EnergyBatteryDevicesWidget } from './widgets/energy-battery-devices-widget';
import { EnergyDeviceTotalsWidget } from './widgets/energy-device-totals-widget';
import { EnergyGridAllocationWidget } from './widgets/energy-grid-allocation-widget';
import { EnergyNowWidget } from './widgets/energy-now-widget';
import { EnergyStatusWidget } from './widgets/energy-status-widget';

const rangeOptions: EnergyRange[] = ['live', 'day', 'week', 'month'];

const widgetOptions: Array<{ id: EnergyWidgetId; label: string }> = [
  { id: 'status', label: 'Summary' },
  { id: 'flow', label: 'Current power' },
  { id: 'consumers', label: 'Device totals' },
  { id: 'cost', label: 'Grid split' },
  { id: 'battery', label: 'Battery devices' },
];

export const EnergySection = memo(function EnergySection() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const {
    overview,
    range,
    setRange,
    visibleWidgetSet,
    toggleWidgetVisibility,
    isConfigured,
    sourceConfig,
    showSetup,
    openSetup,
    closeSetup,
    handleSaveConfig,
    bathroomToiletTodayKWh,
    bathroomToiletPowerW,
    topDeviceTotals,
    gridAllocation,
    recentLoadTrend,
    periodTotals,
    batteryDevices,
  } = useEnergyDashboard();

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeroSection
        accentColor={accentColor}
        surface={surface}
        eyebrow="Energy Dashboard"
        title="Your own energy workspace with live load, period totals, device usage, and battery status."
        description="Built around user-selected widgets so each household can shape a different dashboard."
        actions={
          <>
            {isConfigured && (
              <button
                type="button"
                onClick={openSetup}
                title="Reconfigure energy sensors"
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${surface.border} ${surface.textMuted} ${surface.hoverBg}`}
              >
                <Settings className="h-3.5 w-3.5" />
                Reconfigure
              </button>
            )}
            {rangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  range === option
                    ? 'border-transparent text-white'
                    : `${surface.border} ${surface.textPrimary} ${surface.hoverBg}`
                }`}
                style={range === option ? { backgroundColor: accentColor } : undefined}
              >
                {option}
              </button>
            ))}
          </>
        }
      />

      <section
        className={`rounded-[32px] border p-5 md:p-6 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
      >
        <div className="flex flex-wrap gap-2">
          {widgetOptions.map(({ id, label }) => {
            const active = visibleWidgetSet.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleWidgetVisibility(id)}
                className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'border-transparent text-white'
                    : `${surface.border} ${surface.textSecondary} ${surface.panelMuted}`
                }`}
                style={active ? { backgroundColor: `${accentColor}cc` } : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Demo data notice — shown when no HA config is set */}
      {!isConfigured && !showSetup && (
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${surface.border} ${surface.panelMuted}`}
        >
          <p className={`text-sm ${surface.textSecondary}`}>
            Showing demo data.{' '}
            <span className={surface.textMuted}>
              Connect your Home Assistant energy sensors to see live readings.
            </span>
          </p>
          <button
            type="button"
            onClick={openSetup}
            className="rounded-full px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            Connect to HA Energy
          </button>
        </div>
      )}

      {/* Inline setup panel */}
      {showSetup && (
        <EnergySetupPanel
          initialConfig={sourceConfig ?? undefined}
          onSave={handleSaveConfig}
          onCancel={closeSetup}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="grid gap-6">
          {visibleWidgetSet.has('status') && (
            <EnergyStatusWidget
              liveStats={[
                {
                  label: 'Today consumed',
                  value: `${periodTotals.today.toFixed(1)} kWh`,
                  tone: 'default',
                },
                {
                  label: 'This week',
                  value: `${periodTotals.week.toFixed(1)} kWh`,
                  tone: 'default',
                },
                {
                  label: 'This month',
                  value: `${periodTotals.month.toFixed(1)} kWh`,
                  tone: 'default',
                },
                {
                  label: 'Current power',
                  value: `${Math.round(overview.totals.currentLoadW)} W`,
                  tone: 'default',
                },
                {
                  label: 'Bathroom + toilet today',
                  value: `${bathroomToiletTodayKWh.toFixed(1)} kWh`,
                  tone: 'default',
                },
                {
                  label: 'Bathroom + toilet power',
                  value: `${Math.round(bathroomToiletPowerW)} W`,
                  tone: 'default',
                },
              ]}
              importTodayKWh={undefined}
              solarTodayKWh={undefined}
            />
          )}

          {visibleWidgetSet.has('flow') && (
            <EnergyNowWidget
              currentLoadW={overview.totals.currentLoadW}
              gridImportW={overview.totals.importW}
              trend={recentLoadTrend}
              accentColor={accentColor}
            />
          )}

          {visibleWidgetSet.has('consumers') && (
            <EnergyDeviceTotalsWidget consumers={topDeviceTotals} />
          )}
        </div>

        <div className="grid gap-6">
          {visibleWidgetSet.has('cost') && (
            <EnergyGridAllocationWidget
              importTodayKWh={periodTotals.today}
              allocation={gridAllocation}
            />
          )}

          {visibleWidgetSet.has('battery') && (
            <EnergyBatteryDevicesWidget devices={batteryDevices} />
          )}
        </div>
      </div>
    </div>
  );
});
