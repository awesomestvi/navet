import { MapPin, Sunrise, Sunset } from 'lucide-react';
import { memo } from 'react';
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

  return (
    <>
      <CardWrapper
        className={`${cardShell.backdropClassName} ${weatherShellClassName} ${
          isSmall || usesDetailedLayout ? 'p-5' : 'p-4.5'
        } ${!isEditMode ? 'cursor-pointer' : ''}`}
        style={weatherTintStyle}
        lightOverlayClassName={
          hasCustomTint
            ? (tintSurface.overlayClassName ?? 'bg-transparent')
            : shell.overlayClassName || undefined
        }
        interactionProps={interaction.cardProps}
      >
        <WeatherBackground condition={condition} hasCustomTint={hasCustomTint} size={size} />

        {hasCustomTint ? (
          tintSurface.glowStyle ? (
            <div className="absolute inset-0" style={tintSurface.glowStyle} />
          ) : null
        ) : (
          <div className={`absolute inset-0 ${shell.glowClassName} opacity-55`} />
        )}

        <div className="relative z-2 flex h-full flex-col">
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
                  {visibleForecast.map((day) => (
                    <div key={day.day} className="min-w-0 text-center">
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
              <div className="mb-3 flex items-end justify-between">
                <div className="shrink-0">
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
                      style={{
                        color: textSecondary,
                        textShadow: weatherTextTreatment.textShadow,
                      }}
                    >
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
                    valueStyle={{
                      color: textPrimary,
                      textShadow: weatherTextTreatment.textShadow,
                    }}
                  />
                  <CaptionValue
                    caption={t('weather.wind')}
                    value={`${windSpeed} km/h`}
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
                </div>
              </div>

              <div className="my-8 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Sunrise className="h-4 w-4" style={{ color: textSecondary }} />
                  <span className="text-xs font-medium" style={{ color: textPrimary }}>
                    {sunrise}
                  </span>
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div
                    className="flex-1 border-t border-dashed"
                    style={{ borderColor: textSecondary }}
                  />
                </div>
                <div
                  className="mx-2 text-xs"
                  style={{ color: textSecondary, textShadow: weatherTextTreatment.textShadow }}
                >
                  {daylight}
                </div>
                <div className="mx-4 flex flex-1 items-center">
                  <div
                    className="flex-1 border-t border-dashed"
                    style={{ borderColor: textSecondary }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Sunset className="h-4 w-4" style={{ color: textSecondary }} />
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
                  {visibleForecast.map((day) => (
                    <div key={day.day} className="min-w-0 text-center">
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
