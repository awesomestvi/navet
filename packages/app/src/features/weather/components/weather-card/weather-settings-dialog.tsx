import { CardDialogChoicePill, CardDialogSection } from '@navet/app/components/patterns';
import { BaseCardDialogWithState } from '@navet/app/components/primitives';
import { normalizeCustomCardTint } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { WeatherForecastMode, WeatherMetricId } from '@navet/app/stores/settings-store';
import { getEntityTypeLabel } from '@navet/app/utils/entity-type-label';

interface WeatherSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
  accentColorValue: string;
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
  accentColorValue,
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
  const entityType = getEntityTypeLabel(entityId);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? accentColorValue;
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
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      entityId={entityId}
      entityType={entityType}
      theme={theme}
      tintColor={tintColor}
      onTintColorChange={onTintColorChange}
      defaultTintAccent={accentColorValue}
      controlsTabContent={
        <>
          <CardDialogSection label={t('weather.settings.forecast')} className="mb-4">
            <div className="inline-flex items-center gap-1">
              {(['hourly', 'weekly'] as const).map((option) => (
                <CardDialogChoicePill
                  key={option}
                  active={forecastMode === option}
                  accentColor={activeAccentColor}
                  size="compact"
                  onClick={() => onForecastModeChange(option)}
                >
                  {option === 'hourly'
                    ? t('weather.settings.hourly')
                    : t('weather.settings.weekly')}
                </CardDialogChoicePill>
              ))}
            </div>
          </CardDialogSection>

          <CardDialogSection
            label={t('weather.settings.metrics')}
            helperText={
              selectedAvailableMetricIds.length >= MAX_WEATHER_METRICS
                ? t('weather.settings.metricsLimit')
                : undefined
            }
          >
            <div className="flex flex-wrap gap-2">
              {metricOptions.map((metricId) => {
                const checked = selectedAvailableMetricIds.includes(metricId);
                const disabled =
                  !checked && selectedAvailableMetricIds.length >= MAX_WEATHER_METRICS;

                return (
                  <CardDialogChoicePill
                    key={metricId}
                    active={checked}
                    accentColor={activeAccentColor}
                    size="compact"
                    disabled={disabled}
                    onClick={() => handleMetricChange(metricId, !checked)}
                  >
                    {t(getWeatherMetricLabelKey(metricId))}
                  </CardDialogChoicePill>
                );
              })}
            </div>
          </CardDialogSection>
        </>
      }
    />
  );
}
