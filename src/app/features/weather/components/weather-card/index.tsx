import { MapPin, Sunrise, Sunset } from 'lucide-react';
import { memo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { CaptionValue } from '@/app/components/ui/caption-value';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { useI18n, usePersistedState, useTheme } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore, type WeatherForecastMode } from '@/app/stores/settings-store';
import { formatWeatherConditionLabel, type WeatherCondition, WeatherIcon } from './weather-icon';
import { WeatherSettingsDialog } from './weather-settings-dialog';

// Re-export types
export type { WeatherCondition };
export type ForecastDay = {
  day: string;
  condition: string;
  high: number;
  low: number;
};

interface WeatherCardProps {
  id: string;
  location: string;
  temperature: number;
  condition: WeatherCondition | string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationUnit: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  forecast: ForecastDay[];
  forecastMode: WeatherForecastMode;
  highTemp: number;
  lowTemp: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

function getWeatherCityName(location: string) {
  return (
    location
      .split(',')
      .map((part) => part.trim())
      .find(Boolean) || location
  );
}

/**
 * Premium Weather Card Component
 * High-quality design inspired by modern weather apps
 */
export const WeatherCard = memo(function WeatherCard({
  id: _id,
  location,
  temperature,
  condition,
  humidity,
  windSpeed,
  precipitation,
  precipitationUnit,
  sunrise,
  sunset,
  daylight,
  rainForecast,
  forecast,
  forecastMode: effectiveForecastMode,
  highTemp,
  lowTemp,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: WeatherCardProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [weatherTintColors, setWeatherTintColors] = usePersistedState<Record<string, string>>(
    STORAGE_KEYS.weatherCardTintColors,
    {}
  );
  const selectedForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);
  const cardShell = getCardShellSurfaceTokens(theme);
  const tintColor = weatherTintColors[_id];
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const hasCustomTint = Boolean(tintSurface.panelStyle);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: 'blue',
    accentColor,
    baseColor: tintColor,
  });
  const isGlass = theme === 'glass';
  const shell = getAccentCardShellTokens(theme, 'blue');
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large' || size === 'extra-large';
  const usesDetailedLayout = isMedium || isLarge;
  const visibleForecast = isMedium
    ? forecast.slice(0, 7)
    : isLarge
      ? forecast.slice(0, 8)
      : isSmall
        ? forecast.slice(0, 4)
        : forecast.slice(0, 4);
  const precipitationValue = `${precipitation}${precipitationUnit ? ` ${precipitationUnit}` : ''}`;
  const summaryLabel = formatWeatherConditionLabel(condition);
  const cityName = getWeatherCityName(location);
  const headerIconClassName = isSmall || usesDetailedLayout ? 'h-11 w-11' : 'h-10 w-10';

  // Theme-aware colors
  const textPrimary = textTokens.titleColor;
  const textSecondary = textTokens.subtitleColor;
  const dashedBorder =
    theme === 'light' ? 'border-gray-300' : isGlass ? 'border-white/18' : 'border-slate-600';
  const showHourlyForecast = effectiveForecastMode === 'hourly';
  const interaction = useEntityCardInteractionController({
    ariaLabel: cityName,
    isEditMode: _isEditMode,
    onOpenControls: () => setIsSettingsOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  });
  const setTintColor = (nextTintColor?: string) => {
    setWeatherTintColors((current) => {
      if (!nextTintColor) {
        const { [_id]: _removedTintColor, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [_id]: nextTintColor,
      };
    });
  };

  return (
    <>
      <CardWrapper
        className={`${cardShell.backdropClassName} ${hasCustomTint ? 'border' : shell.containerClassName} ${
          isSmall || usesDetailedLayout ? 'p-5' : 'p-4.5'
        } ${!_isEditMode ? 'cursor-pointer' : ''}`}
        style={tintSurface.panelStyle}
        lightOverlayClassName={
          hasCustomTint
            ? (tintSurface.overlayClassName ?? 'bg-transparent')
            : shell.overlayClassName || undefined
        }
        interactionProps={interaction.cardProps}
      >
        {/* Subtle gradient overlay */}
        {hasCustomTint ? (
          tintSurface.glowStyle ? (
            <div className="absolute inset-0" style={tintSurface.glowStyle} />
          ) : null
        ) : (
          <div className={`absolute inset-0 ${shell.glowClassName}`} />
        )}

        <div className="relative z-[2] h-full flex flex-col">
          <div
            className={`flex items-start justify-between gap-3 ${isMedium || isSmall ? 'mb-2' : 'mb-3'}`}
          >
            <div className="min-w-0">
              <div className="inline-flex min-w-0 items-center gap-2">
                <MapPin
                  className={`${isMedium || isSmall ? 'mt-0 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4'} shrink-0`}
                  style={{ color: textSecondary }}
                />
                <div
                  className={`truncate ${
                    isMedium || isSmall ? 'text-[13px]' : 'text-[15px]'
                  } font-semibold tracking-[-0.03em]`}
                  style={{ color: textPrimary }}
                >
                  {cityName}
                </div>
              </div>

              {isMedium || isSmall ? (
                <div className="mt-1.5">
                  <div
                    className="mb-1 text-3xl font-bold leading-none"
                    style={{ color: textPrimary }}
                  >
                    {temperature}°C
                  </div>
                  <div className="text-xs" style={{ color: textSecondary }}>
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <WeatherIcon
                condition={condition}
                className={`${headerIconClassName} ml-auto shrink-0`}
                style={{ color: textPrimary }}
              />
              <div
                className="mt-1 text-[12px] font-medium leading-tight"
                style={{ color: textSecondary }}
              >
                {summaryLabel}
              </div>
            </div>
          </div>

          {isSmall || isMedium ? (
            <div className="flex h-full flex-col">
              {visibleForecast.length > 0 ? (
                <div className="mt-auto flex w-full items-start justify-between">
                  {visibleForecast.map((day, index) => (
                    <div key={index} className="min-w-0 text-center">
                      <div className="mb-1 text-[11px]" style={{ color: textSecondary }}>
                        {day.day}
                      </div>
                      <WeatherIcon
                        condition={day.condition}
                        className="mx-auto mb-1 h-6 w-6"
                        style={{ color: textPrimary }}
                      />
                      {showHourlyForecast ? (
                        <div
                          className="text-[11px] font-medium leading-none"
                          style={{ color: textPrimary }}
                        >
                          {day.high}°
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[11px] leading-none">
                          <span className="font-medium" style={{ color: textPrimary }}>
                            {day.high}°
                          </span>
                          <span style={{ color: textSecondary }}>{day.low}°</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto">
              {/* Main Section: Temperature + Details */}
              <div className="mb-3 flex items-end justify-between">
                {/* Temperature with rain forecast below */}
                <div className="flex-shrink-0">
                  <div
                    className="mb-1 text-3xl font-bold leading-none"
                    style={{ color: textPrimary }}
                  >
                    {temperature}°C
                  </div>
                  <div className="mb-0.5 text-xs" style={{ color: textSecondary }}>
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                  {rainForecast ? (
                    <div className="text-xs" style={{ color: textSecondary }}>
                      {rainForecast}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-0.5 flex-shrink-0">
                  <CaptionValue
                    caption={t('weather.precipitation')}
                    value={precipitationValue}
                    align="right"
                    captionStyle={{ color: textSecondary }}
                    valueStyle={{ color: textPrimary }}
                  />
                  <CaptionValue
                    caption={t('weather.humidity')}
                    value={`${humidity}%`}
                    align="right"
                    captionStyle={{ color: textSecondary }}
                    valueStyle={{ color: textPrimary }}
                  />
                  <CaptionValue
                    caption={t('weather.wind')}
                    value={`${windSpeed} km/h`}
                    align="right"
                    captionStyle={{ color: textSecondary }}
                    valueStyle={{ color: textPrimary }}
                  />
                </div>
              </div>

              <div className="my-8 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Sunrise className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-medium" style={{ color: textPrimary }}>
                    {sunrise}
                  </span>
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
                </div>
                <div className="mx-2 text-xs" style={{ color: textSecondary }}>
                  {daylight}
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-medium" style={{ color: textPrimary }}>
                    {sunset}
                  </span>
                </div>
              </div>

              {visibleForecast.length > 0 && (
                <div className="flex justify-between gap-3">
                  {visibleForecast.map((day, index) => (
                    <div key={index} className="min-w-0 text-center">
                      <div className="mb-2 text-xs" style={{ color: textSecondary }}>
                        {day.day}
                      </div>
                      <WeatherIcon
                        condition={day.condition}
                        className="mx-auto mb-2 h-8 w-8"
                        style={{ color: textPrimary }}
                      />
                      {showHourlyForecast ? (
                        <div className="text-xs font-medium" style={{ color: textPrimary }}>
                          {day.high}°
                        </div>
                      ) : (
                        <>
                          <div className="mb-1 text-xs font-medium" style={{ color: textPrimary }}>
                            {day.high}°
                          </div>
                          <div className="text-xs" style={{ color: textSecondary }}>
                            {day.low}°
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardWrapper>

      {isSettingsOpen ? (
        <WeatherSettingsDialog
          entityId={_id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          theme={theme}
          title={cityName}
          location={location}
          forecastMode={selectedForecastMode}
          onForecastModeChange={(mode) => updateSettings({ weatherForecastMode: mode })}
          tintColor={tintColor}
          onTintColorChange={setTintColor}
        />
      ) : null}
    </>
  );
});
