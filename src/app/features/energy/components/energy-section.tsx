import { Settings } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { DashboardHeroSection } from '../../dashboard/components/dashboard-hero-section';
import { useEnergyDashboard } from '../hooks/use-energy-dashboard';
import type { EnergyRange } from '../types/energy.types';
import { EnergySetupPanel } from './energy-setup-panel';
import { EnergyBatteryDevicesWidget } from './widgets/energy-battery-devices-widget';
import { EnergyDeviceTotalsWidget } from './widgets/energy-device-totals-widget';
import { EnergyGridAllocationWidget } from './widgets/energy-grid-allocation-widget';
import { EnergyNowWidget } from './widgets/energy-now-widget';

const rangeOptions: EnergyRange[] = ['live', 'day', 'week', 'month'];

function EnergySectionBand({
  title,
  description,
  children,
  surface,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { t } = useI18n();
  return (
    <section className="space-y-4">
      <div>
        <div
          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
        >
          {t('energy.band.eyebrow')}
        </div>
        <h2
          className={`mt-2 text-lg font-semibold tracking-tight md:text-xl ${surface.textPrimary}`}
        >
          {title}
        </h2>
        {description ? (
          <p className={`mt-1.5 max-w-2xl text-sm ${surface.textSecondary}`}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export const EnergySection = memo(function EnergySection() {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const {
    overview,
    range,
    setRange,
    isConfigured,
    sourceConfig,
    showSetup,
    openSetup,
    closeSetup,
    handleSaveConfig,
    topDeviceTotals,
    gridAllocation,
    recentLoadTrend,
    periodTotals,
    batteryDevices,
  } = useEnergyDashboard();

  const overviewHighlights = [
    {
      label: t('energy.stats.currentPower'),
      value: `${Math.round(overview.totals.currentLoadW)} W`,
    },
    {
      label: t('energy.stats.today'),
      value: `${periodTotals.today.toFixed(1)} kWh`,
    },
    {
      label: t('energy.stats.gridImport'),
      value: `${overview.totals.importTodayKWh.toFixed(1)} kWh`,
    },
    {
      label: t('energy.stats.costToday'),
      value: `${overview.totals.costToday.toFixed(2)}`,
    },
  ];

  const showBatteryDevices = batteryDevices.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeroSection
        accentColor={accentColor}
        surface={surface}
        eyebrow={t('energy.hero.eyebrow')}
        title={t('energy.hero.title')}
        description={t('energy.hero.description')}
        actions={
          <>
            {isConfigured ? (
              <button
                type="button"
                onClick={openSetup}
                title={t('energy.hero.reconfigureTitle')}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${surface.border} ${surface.textMuted} ${surface.hoverBg}`}
              >
                <Settings className="h-3.5 w-3.5" />
                {t('energy.hero.reconfigure')}
              </button>
            ) : null}
            {rangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  range === option
                    ? 'border-transparent text-white'
                    : `${surface.border} ${surface.textPrimary} ${surface.hoverBg}`
                }`}
                style={range === option ? { backgroundColor: accentColor } : undefined}
              >
                {t(`energy.range.${option}`)}
              </button>
            ))}
          </>
        }
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            {overviewHighlights.map((item) => (
              <div
                key={item.label}
                className={`rounded-3xl border px-4 py-3 ${surface.border} ${surface.panelMuted}`}
              >
                <div
                  className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}
                >
                  {item.label}
                </div>
                <div className={`mt-2 text-lg font-semibold ${surface.textPrimary}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        }
      />

      {!isConfigured && !showSetup ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${surface.border} ${surface.panelMuted}`}
        >
          <p className={`text-sm ${surface.textSecondary}`}>
            {t('energy.demo.message')}{' '}
            <span className={surface.textMuted}>{t('energy.demo.hint')}</span>
          </p>
          <button
            type="button"
            onClick={openSetup}
            className="rounded-full px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            {t('energy.demo.connect')}
          </button>
        </div>
      ) : null}

      {showSetup ? (
        <EnergySetupPanel
          initialConfig={sourceConfig ?? undefined}
          onSave={handleSaveConfig}
          onCancel={closeSetup}
        />
      ) : null}

      <div className="space-y-6">
        <EnergySectionBand
          title={t('energy.band.rightNow.title')}
          description={t('energy.band.rightNow.description')}
          surface={surface}
        >
          <EnergyNowWidget
            currentLoadW={overview.totals.currentLoadW}
            gridImportW={overview.totals.importW}
            trend={recentLoadTrend}
            accentColor={accentColor}
          />
        </EnergySectionBand>

        <EnergySectionBand
          title={t('energy.band.today.title')}
          description={t('energy.band.today.description')}
          surface={surface}
        >
          <div
            className={`grid gap-6 ${showBatteryDevices ? 'xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]' : ''}`}
          >
            <EnergyGridAllocationWidget
              importTodayKWh={periodTotals.today}
              allocation={gridAllocation}
            />
            {showBatteryDevices ? <EnergyBatteryDevicesWidget devices={batteryDevices} /> : null}
          </div>
        </EnergySectionBand>

        <EnergySectionBand
          title={t('energy.band.devices.title')}
          description={t('energy.band.devices.description')}
          surface={surface}
        >
          <EnergyDeviceTotalsWidget consumers={topDeviceTotals} />
        </EnergySectionBand>
      </div>
    </div>
  );
});
