import { MapPin, Sunrise, Sunset } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { CaptionValue } from '@/app/components/ui/caption-value';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { useI18n } from '@/app/hooks';
import type { WeatherForecastMode } from '@/app/stores/settings-store';
import { useWeatherCardController } from './use-weather-card-controller';
import { WeatherBackground } from './weather-card-overlays';
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

export const WeatherCard = memo(function WeatherCard({
  id,
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
  isEditMode,
}: WeatherCardProps) {
  const { t } = useI18n();
  const {
    theme,
    surface,
    cardShell,
    shell,
    tintColor,
    tintSurface,
    hasCustomTint,
    weatherTintStyle,
    weatherTextTreatment,
    weatherShellClassName,
    isSettingsOpen,
    setIsSettingsOpen,
    interaction,
    cityName,
    selectedForecastMode,
    updateSettings,
    setTintColor,
  } = useWeatherCardController({ id, location, condition, isEditMode });

  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large';
  const usesDetailedLayout = isMedium || isLarge;
  const visibleForecast = isSmall ? forecast.slice(0, 4) : forecast.slice(0, 7);
  const precipitationValue = `${precipitation}${precipitationUnit ? ` ${precipitationUnit}` : ''}`;
  const summaryLabel = formatWeatherConditionLabel(condition);
  const headerIconClassName = isSmall || usesDetailedLayout ? 'h-11 w-11' : 'h-10 w-10';
  const showHourlyForecast = effectiveForecastMode === 'hourly';

  const textPrimary = weatherTextTreatment.primary;
  const textSecondary = weatherTextTreatment.secondary;
  const shellGlowOpacityClass =
    theme === 'black' ? 'opacity-18' : theme === 'dark' ? 'opacity-28' : 'opacity-55';
  const weatherOverlayClassName = hasCustomTint
    ? (tintSurface.overlayClassName ?? 'bg-transparent')
    : [surface.lightOverlay, shell.overlayClassName].filter(Boolean).join(' ');

  // Memoize style objects to prevent GC pressure and enable React optimizations
  const gradientBackgroundStyle = useMemo(
    () =>
      ({
        background:
          theme === 'light'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 32%, rgba(248,250,252,0.14) 100%)'
            : theme === 'glass'
              ? 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 32%, rgba(255,255,255,0.02) 100%)'
              : theme === 'black'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 28%, rgba(0,0,0,0.14) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 28%, rgba(2,6,23,0.12) 100%)',
      }) as React.CSSProperties,
    [theme]
  );

  const iconStylePrimary = useMemo(
    () => ({ color: textPrimary }) as React.CSSProperties,
    [textPrimary]
  );

  const iconStyleSecondary = useMemo(
    () => ({ color: textSecondary }) as React.CSSProperties,
    [textSecondary]
  );

  const titleStyle = useMemo(
    () =>
      ({
        color: textPrimary,
        textShadow: weatherTextTreatment.textShadow,
      }) as React.CSSProperties,
    [textPrimary, weatherTextTreatment.textShadow]
  );

  const subtitleStyle = useMemo(
    () =>
      ({
        color: textSecondary,
        textShadow: weatherTextTreatment.textShadow,
      }) as React.CSSProperties,
    [textSecondary, weatherTextTreatment.textShadow]
  );

  return (
    <>
      <CardWrapper
        className={`${cardShell.backdropClassName} ${weatherShellClassName} ${!isEditMode ? 'cursor-pointer' : ''}`}
        style={weatherTintStyle}
        lightOverlayClassName={weatherOverlayClassName || undefined}
        showShadow={false}
        interactionProps={interaction.cardProps}
      >
        <WeatherBackground
          condition={condition}
          hasCustomTint={hasCustomTint}
          size={size}
          theme={theme}
        />

        {hasCustomTint ? (
          tintSurface.glowStyle ? (
            <div className="absolute inset-0" style={tintSurface.glowStyle} />
          ) : null
        ) : (
          <div className={`absolute inset-0 ${shell.glowClassName} ${shellGlowOpacityClass}`} />
        )}
        {!hasCustomTint ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={gradientBackgroundStyle}
          />
        ) : null}

        <div className="relative z-2 flex h-full flex-col p-3">
          <div
            className={`flex items-start justify-between gap-3 ${isMedium || isSmall ? 'mb-2' : 'mb-3'}`}
          >
            <div className="min-w-0">
              <div className="inline-flex min-w-0 items-center gap-2">
                <MapPin
                  className={`${isMedium || isSmall ? 'mt-0 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4'} shrink-0`}
                  style={iconStyleSecondary}
                />
                <div
                  className={`truncate ${
                    isMedium || isSmall ? 'text-sm' : 'text-base'
                  } font-semibold tracking-[-0.03em]`}
                  style={titleStyle}
                >
                  {cityName}
                </div>
              </div>

              {isMedium || isSmall ? (
                <div className="mt-1.5">
                  <div className="mb-1 text-3xl font-bold leading-none" style={titleStyle}>
                    {temperature}°C
                  </div>
                  <div className="text-sm" style={subtitleStyle}>
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <WeatherIcon
                condition={condition}
                className={`${headerIconClassName} ml-auto shrink-0`}
                style={iconStylePrimary}
              />
              <div className="mt-1 text-sm font-medium leading-tight" style={subtitleStyle}>
                {summaryLabel}
              </div>
            </div>
          </div>

          {isSmall || isMedium ? (
            <div className="flex h-full flex-col">
              {visibleForecast.length > 0 ? (
                <div className="mt-auto flex w-full items-start justify-between">
                  {visibleForecast.map((day) => (
                    <div key={day.day} className="min-w-0 text-center">
                      <div className="mb-1 text-sm" style={iconStyleSecondary}>
                        {day.day}
                      </div>
                      <WeatherIcon
                        condition={day.condition}
                        className="mx-auto mb-1 h-6 w-6"
                        style={iconStylePrimary}
                      />
                      {showHourlyForecast ? (
                        <div className="text-sm font-medium leading-none" style={titleStyle}>
                          {day.high}°
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-sm leading-none">
                          <span className="font-medium" style={titleStyle}>
                            {day.high}°
                          </span>
                          <span style={subtitleStyle}>{day.low}°</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto">
              <div className="mb-3 flex items-end justify-between">
                <div className="shrink-0">
                  <div className="mb-1 text-3xl font-bold leading-none" style={titleStyle}>
                    {temperature}°C
                  </div>
                  <div className="mb-0.5 text-sm" style={subtitleStyle}>
                    H:{highTemp}° L:{lowTemp}°
                  </div>
                  {rainForecast ? (
                    <div className="text-sm" style={subtitleStyle}>
                      {rainForecast}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 space-y-0.5">
                  <CaptionValue
                    caption={t('weather.precipitation')}
                    value={precipitationValue}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={{
                      color: textPrimary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                  />
                  <CaptionValue
                    caption={t('weather.humidity')}
                    value={`${humidity}%`}
                    align="right"
                    captionStyle={{
                      color: textSecondary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                    valueStyle={titleStyle}
                  />
                  <CaptionValue
                    caption={t('weather.wind')}
                    value={`${windSpeed} km/h`}
                    align="right"
                    captionStyle={subtitleStyle}
                    valueStyle={titleStyle}
                  />
                </div>
              </div>

              <div className="my-8 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Sunrise className="h-4 w-4" style={iconStyleSecondary} />
                  <span className="text-sm font-medium" style={titleStyle}>
                    {sunrise}
                  </span>
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div
                    className="flex-1 border-t border-dashed"
                    style={{ borderColor: textSecondary }}
                  />
                </div>
                <div className="mx-2 text-sm" style={subtitleStyle}>
                  {daylight}
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div
                    className="flex-1 border-t border-dashed"
                    style={{ borderColor: textSecondary }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="h-4 w-4" style={iconStyleSecondary} />
                  <span className="text-sm font-medium" style={titleStyle}>
                    {sunset}
                  </span>
                </div>
              </div>

              {visibleForecast.length > 0 && (
                <div className="flex justify-between gap-3">
                  {visibleForecast.map((day) => (
                    <div key={day.day} className="min-w-0 text-center">
                      <div
                        className="mb-2 text-sm"
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
                        style={iconStylePrimary}
                      />
                      {showHourlyForecast ? (
                        <div className="text-sm font-medium" style={titleStyle}>
                          {day.high}°
                        </div>
                      ) : (
                        <>
                          <div className="mb-1 text-sm font-medium" style={titleStyle}>
                            {day.high}°
                          </div>
                          <div className="text-sm" style={subtitleStyle}>
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
          entityId={id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          theme={theme}
          title={cityName}
          forecastMode={selectedForecastMode}
          onForecastModeChange={(mode) => updateSettings({ weatherForecastMode: mode })}
          tintColor={tintColor}
          onTintColorChange={setTintColor}
        />
      ) : null}
    </>
  );
});
