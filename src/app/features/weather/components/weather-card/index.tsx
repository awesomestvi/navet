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

function normalizeWeatherCondition(condition: WeatherCondition | string) {
  return condition.trim().toLowerCase().replace(/_/g, '-');
}

function getWeatherBackgroundTheme(condition: WeatherCondition | string) {
  const normalized = normalizeWeatherCondition(condition);

  switch (normalized) {
    case 'clear':
    case 'sunny':
      return 'sunny';
    case 'clear-night':
      return 'clear-night';
    case 'cloudy':
    case 'overcast':
    case 'partly-cloudy':
    case 'partly cloudy':
    case 'partlycloudy':
      return 'cloudy';
    case 'rainy':
    case 'rain':
    case 'pouring':
    case 'drizzle':
    case 'lightning-rainy':
    case 'thunderstorm':
    case 'storm':
    case 'lightning':
      return 'rain';
    case 'snowy':
    case 'snow':
    case 'snowy-rainy':
      return 'snow';
    default:
      return 'cloudy';
  }
}

function getWeatherTextTreatment(
  condition: WeatherCondition | string,
  hasCustomTint: boolean,
  fallback: { titleColor: string; subtitleColor: string }
) {
  if (hasCustomTint) {
    return {
      primary: fallback.titleColor,
      secondary: fallback.subtitleColor,
      textShadow: 'none',
    };
  }

  const variant = getWeatherBackgroundTheme(condition);

  switch (variant) {
    case 'sunny':
    case 'snow':
      return {
        primary: 'rgba(255,255,255,0.98)',
        secondary: 'rgba(255,255,255,0.84)',
        textShadow: '0 1px 10px rgba(83, 38, 12, 0.18)',
      };
    case 'cloudy':
      return {
        primary: 'rgba(255,255,255,0.98)',
        secondary: 'rgba(255,255,255,0.82)',
        textShadow: '0 1px 10px rgba(17, 41, 78, 0.18)',
      };
    case 'rain':
    case 'clear-night':
      return {
        primary: 'rgba(255,255,255,0.99)',
        secondary: 'rgba(255,255,255,0.78)',
        textShadow: '0 1px 12px rgba(5, 10, 32, 0.32)',
      };
    default:
      return {
        primary: fallback.titleColor,
        secondary: fallback.subtitleColor,
        textShadow: 'none',
      };
  }
}

function WeatherBackground({
  condition,
  hasCustomTint,
}: {
  condition: WeatherCondition | string;
  hasCustomTint: boolean;
}) {
  const variant = getWeatherBackgroundTheme(condition);

  if (hasCustomTint) {
    return null;
  }

  if (variant === 'sunny') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#ef6d63_0%,#f38b57_48%,#f7b046_100%)]" />
        <div className="absolute right-[-8%] top-[-42%] h-[130%] w-[56%] rounded-full bg-white/10" />
        <div className="absolute right-[8%] top-[-34%] h-[115%] w-[46%] rounded-full bg-amber-200/18" />
        <div className="absolute right-[20%] top-[-28%] h-[98%] w-[36%] rounded-full bg-orange-300/18" />
      </>
    );
  }

  if (variant === 'clear-night') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#203f86_0%,#27488f_45%,#284382_100%)]" />
        <div className="absolute right-[10%] top-[-30%] h-28 w-28 rounded-full bg-amber-100/85" />
        <div className="absolute right-[1%] top-[-62%] h-44 w-44 rounded-full bg-amber-100/10" />
        <div className="absolute right-[-10%] top-[-74%] h-56 w-56 rounded-full bg-blue-100/8" />
      </>
    );
  }

  if (variant === 'rain') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#2e3567_0%,#30345d_48%,#293157_100%)]" />
        <div className="absolute inset-y-0 right-[8%] w-[42%] bg-[linear-gradient(160deg,transparent_6%,rgba(255,255,255,0.12)_7%,transparent_8%,transparent_15%,rgba(255,255,255,0.12)_16%,transparent_17%,transparent_24%,rgba(255,255,255,0.10)_25%,transparent_26%,transparent_33%,rgba(255,255,255,0.10)_34%,transparent_35%,transparent_42%,rgba(255,255,255,0.12)_43%,transparent_44%,transparent_51%,rgba(255,255,255,0.08)_52%,transparent_53%,transparent_60%,rgba(255,255,255,0.12)_61%,transparent_62%)] opacity-70" />
        <div className="absolute left-[45%] top-0 h-full w-px rotate-[18deg] bg-white/8" />
        <div className="absolute left-[61%] top-[-6%] h-[112%] w-px rotate-[18deg] bg-white/10" />
      </>
    );
  }

  if (variant === 'snow') {
    return (
      <>
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#f8a650_0%,#f6b46b_46%,#f8cf98_100%)]" />
        <div className="absolute left-[-8%] bottom-[-20%] h-20 w-[68%] rounded-[100%] bg-white/12" />
        <div className="absolute left-[24%] bottom-[-14%] h-16 w-[52%] rounded-[100%] bg-white/14" />
        <div className="absolute right-[-4%] bottom-[-24%] h-20 w-[48%] rounded-[100%] bg-white/10" />
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(115deg,#3d90df_0%,#428cdf_50%,#4b97e8_100%)]" />
      <div className="absolute left-[14%] top-[-30%] h-20 w-32 rounded-[100%] bg-white/12" />
      <div className="absolute left-[34%] top-[-24%] h-16 w-28 rounded-[100%] bg-white/10" />
      <div className="absolute left-[8%] top-[-10%] h-12 w-24 rounded-[100%] bg-white/9" />
    </>
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
  const weatherTextTreatment = getWeatherTextTreatment(condition, hasCustomTint, textTokens);

  // Theme-aware colors
  const textPrimary = weatherTextTreatment.primary;
  const textSecondary = weatherTextTreatment.secondary;
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
        <WeatherBackground condition={condition} hasCustomTint={hasCustomTint} />

        {hasCustomTint ? (
          tintSurface.glowStyle ? (
            <div className="absolute inset-0" style={tintSurface.glowStyle} />
          ) : null
        ) : (
          <div className={`absolute inset-0 ${shell.glowClassName} opacity-55`} />
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
                  style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                >
                  {cityName}
                </div>
              </div>

              {isMedium || isSmall ? (
                <div className="mt-1.5">
                  <div
                    className="mb-1 text-3xl font-bold leading-none"
                    style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    {temperature}°C
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                  >
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
                style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
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
                          style={{
                            color: textPrimary,
                            textShadow: weatherTextTreatment.textShadow,
                          }}
                        >
                          {day.high}°
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[11px] leading-none">
                          <span
                            className="font-medium"
                            style={{
                              color: textPrimary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.high}°
                          </span>
                          <span
                            style={{
                              color: textSecondary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.low}°
                          </span>
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
                    style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    {temperature}°C
                  </div>
                  <div
                    className="mb-0.5 text-xs"
                    style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                  {rainForecast ? (
                    <div
                      className="text-xs"
                      style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                    >
                      {rainForecast}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-0.5 flex-shrink-0">
                  <CaptionValue
                    caption={t('weather.precipitation')}
                    value={precipitationValue}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  />
                  <CaptionValue
                    caption={t('weather.humidity')}
                    value={`${humidity}%`}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  />
                  <CaptionValue
                    caption={t('weather.wind')}
                    value={`${windSpeed} km/h`}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
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
                <div
                  className="mx-2 text-xs"
                  style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                >
                  {daylight}
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="h-4 w-4 text-orange-400" />
                  <span
                    className="text-xs font-medium"
                    style={{ color: textPrimary, textShadow: weatherTextTreatment.textShadow }}
                  >
                    {sunset}
                  </span>
                </div>
              </div>

              {visibleForecast.length > 0 && (
                <div className="flex justify-between gap-3">
                  {visibleForecast.map((day, index) => (
                    <div key={index} className="min-w-0 text-center">
                      <div
                        className="mb-2 text-xs"
                        style={{
                          color: textSecondary,
                          textShadow: weatherTextTreatment.textShadow,
                        }}
                      >
                        {day.day}
                      </div>
                      <WeatherIcon
                        condition={day.condition}
                        className="mx-auto mb-2 h-8 w-8"
                        style={{ color: textPrimary }}
                      />
                      {showHourlyForecast ? (
                        <div
                          className="text-xs font-medium"
                          style={{
                            color: textPrimary,
                            textShadow: weatherTextTreatment.textShadow,
                          }}
                        >
                          {day.high}°
                        </div>
                      ) : (
                        <>
                          <div
                            className="mb-1 text-xs font-medium"
                            style={{
                              color: textPrimary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
                            {day.high}°
                          </div>
                          <div
                            className="text-xs"
                            style={{
                              color: textSecondary,
                              textShadow: weatherTextTreatment.textShadow,
                            }}
                          >
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
