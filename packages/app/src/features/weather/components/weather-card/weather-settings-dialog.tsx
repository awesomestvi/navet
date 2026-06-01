import {
  CardDialogBody,
  CardDialogChoicePill,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@navet/app/components/shared/device-editor';
import { getAccentCardShellTokens } from '@navet/app/components/shared/theme/accent-card-shell-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { WeatherForecastMode, WeatherMetricId } from '@navet/app/stores/settings-store';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';
import { Palette, Sliders } from 'lucide-react';
import { useState } from 'react';

interface WeatherSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
  title: string;
  forecastMode: WeatherForecastMode;
  onForecastModeChange: (mode: WeatherForecastMode) => void;
  metricIds: WeatherMetricId[];
  onMetricIdsChange: (metricIds: WeatherMetricId[]) => void;
  availableMetricIds: WeatherMetricId[];
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

const WEATHER_METRIC_OPTIONS: WeatherMetricId[] = [
  'precipitation',
  'humidity',
  'wind',
  'feelsLike',
  'windGust',
  'pressure',
  'uvIndex',
  'cloudCover',
];
const MAX_WEATHER_METRICS = 5;

function getWeatherMetricLabelKey(metricId: WeatherMetricId) {
  return `weather.metric.${metricId}` as const;
}

export function WeatherSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  theme,
  title,
  forecastMode,
  onForecastModeChange,
  metricIds,
  onMetricIdsChange,
  availableMetricIds,
  tintColor,
  onTintColorChange,
}: WeatherSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const shell = getAccentCardShellTokens(theme, 'blue');
  const isOn = theme !== 'light';
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? '#3b82f6';
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    padding: false,
    fallbackDecoration: {
      glowClassName: shell.glowClassName,
      overlayClassName: shell.overlayClassName,
    },
    fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl ${shell.containerClassName}`,
  });
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, '#3b82f6');
  const [activeTab, setActiveTab] = useState('controls');
  const availableMetricIdSet = new Set(availableMetricIds);
  const metricOptions = WEATHER_METRIC_OPTIONS.filter((metricId) =>
    availableMetricIdSet.has(metricId)
  );
  const selectedAvailableMetricIds = metricIds.filter((metricId) =>
    availableMetricIdSet.has(metricId)
  );
  const handleMetricChange = (metricId: WeatherMetricId, checked: boolean) => {
    if (checked) {
      if (
        selectedAvailableMetricIds.includes(metricId) ||
        selectedAvailableMetricIds.length >= MAX_WEATHER_METRICS
      ) {
        return;
      }

      onMetricIdsChange([...selectedAvailableMetricIds, metricId]);
      return;
    }

    if (selectedAvailableMetricIds.length <= 1) {
      return;
    }

    onMetricIdsChange(selectedAvailableMetricIds.filter((id) => id !== metricId));
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <CustomScrollbar isOn={isOn}>
        <CardDialogBody>
          <CardDialogHeader title={title} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                {t('common.controls')}
              </CardDialogTabTrigger>
              {onTintColorChange ? (
                <CardDialogTabTrigger
                  active={activeTab === 'card'}
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  {t('common.customize')}
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5">
              <CardDialogSection label={t('weather.settings.forecast')} className="mb-4">
                <div className="inline-flex items-center gap-1">
                  {(['hourly', 'weekly'] as const).map((option) => (
                    <CardDialogChoicePill
                      key={option}
                      active={forecastMode === option}
                      onClick={() => onForecastModeChange(option)}
                    >
                      {option === 'hourly'
                        ? t('weather.settings.hourly')
                        : t('weather.settings.weekly')}
                    </CardDialogChoicePill>
                  ))}
                </div>
              </CardDialogSection>

              <CardDialogSection label={t('weather.settings.metrics')}>
                <div className="space-y-2">
                  {metricOptions.map((metricId) => {
                    const checked = selectedAvailableMetricIds.includes(metricId);
                    const disabled =
                      !checked && selectedAvailableMetricIds.length >= MAX_WEATHER_METRICS;

                    return (
                      <SelectableCheckboxRow
                        key={metricId}
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(nextChecked) => handleMetricChange(metricId, nextChecked)}
                        label={t(getWeatherMetricLabelKey(metricId))}
                        description={disabled ? t('weather.settings.metricsLimit') : undefined}
                        checkboxAppearance="secondary"
                        checkboxPaletteColor={activeAccentColor}
                        rowClassName={`${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
                        descriptionClassName={surface.textMuted}
                        selectedStyle={{
                          ...sectionStyle,
                          borderColor: `${activeAccentColor}80`,
                        }}
                        unselectedStyle={sectionStyle}
                      />
                    );
                  })}
                </div>
              </CardDialogSection>
            </TabPanel>

            {onTintColorChange ? (
              <TabPanel value="card" className="mt-5">
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  isOn={isOn}
                  defaultColor="#3b82f6"
                />
              </TabPanel>
            ) : null}
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
}
