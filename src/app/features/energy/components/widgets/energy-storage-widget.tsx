import { Zap } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { EnergyGauge } from '../charts/energy-gauge';
import { EnergyQualityBar } from '../charts/energy-quality-bar';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyStorageWidgetProps {
  batteryPercent: number;
  solarW: number;
  currentLoadW: number;
  importW: number;
  hasBattery?: boolean;
  hasSolar?: boolean;
}

export const EnergyStorageWidget = memo(function EnergyStorageWidget({
  batteryPercent,
  solarW,
  currentLoadW,
  importW,
  hasBattery = true,
  hasSolar = true,
}: EnergyStorageWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const solarCoverage = Math.round((solarW / Math.max(currentLoadW, 1)) * 100);
  // Grid dependency quality: 0% import = 100 quality, high import = low quality
  const gridQuality = Math.max(0, Math.round(100 - (importW / Math.max(currentLoadW, 1)) * 100));

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.storage.title')}
      eyebrow={t('energy.widgets.storage.eyebrow')}
    >
      <div className="grid gap-4">
        {hasBattery && (
          <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {t('energy.widgets.storage.batteryReserve')}
            </div>
            <EnergyGauge
              value={batteryPercent}
              accentColor="#34d399"
              label={`${batteryPercent}%`}
              sublabel={t('energy.widgets.storage.charge')}
            />
          </div>
        )}

        {hasSolar && (
          <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {t('energy.widgets.storage.solarCoverage')}
            </div>
            <EnergyGauge
              value={solarCoverage}
              accentColor="#f59e0b"
              label={`${solarCoverage}%`}
              sublabel={t('energy.widgets.storage.ofCurrentLoad')}
            />
          </div>
        )}

        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`flex items-center justify-between gap-4`}>
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {t('energy.widgets.storage.gridDependency')}
            </div>
            <div
              className={`flex items-center gap-1.5 text-sm font-semibold ${surface.textPrimary}`}
            >
              <Zap className="h-3.5 w-3.5" />
              {t('energy.widgets.storage.importKw', { value: (importW / 1000).toFixed(1) })}
            </div>
          </div>
          <div className="mt-3">
            <EnergyQualityBar
              value={gridQuality}
              badLabel={t('energy.widgets.storage.gridHeavy')}
              goodLabel={t('energy.widgets.storage.selfSufficient')}
              accentColor="#34d399"
            />
          </div>
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
