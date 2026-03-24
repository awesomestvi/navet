import { Sunrise, Sunset } from 'lucide-react';
import { memo, useState } from 'react';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { CaptionValue } from '@/app/components/ui/caption-value';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { useI18n, useTheme } from '@/app/hooks';
import { getWeatherIconComponent, type WeatherCondition, WeatherIcon } from './weather-icon';
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
  highTemp: number;
  lowTemp: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

/**
 * Premium Weather Card Component
 * High-quality design inspired by modern weather apps
 */
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
  highTemp,
  lowTemp,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: WeatherCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const shell = getAccentCardShellTokens(theme, 'blue');
  const isSmall = isCompactCardSize(size);
  const isLarge = size === 'large';
  const visibleForecast = isLarge ? forecast : forecast.slice(0, 3);
  const precipitationValue = `${precipitation}${precipitationUnit ? ` ${precipitationUnit}` : ''}`;
  const HeaderIcon = getWeatherIconComponent(condition);

  // Theme-aware colors
  const textPrimary = surface.textPrimary;
  const textSecondary = surface.textSubtle;
  const dashedBorder =
    theme === 'light' ? 'border-gray-300' : isGlass ? 'border-white/18' : 'border-slate-600';

  return (
    <CardWrapper
      className={`${cardShell.backdropClassName} ${shell.containerClassName} p-5`}
      lightOverlayClassName={shell.overlayClassName || undefined}
    >
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 ${shell.glowClassName}`} />

      <div className="relative z-[2] h-full flex flex-col">
        <button
          type="button"
          className="mb-2 block w-full text-left"
          onClick={(event) => {
            event.stopPropagation();
            setIsSettingsOpen(true);
          }}
        >
          <EntityCardHeader
            title={location}
            subtitle={t('weather.subtitle')}
            size={size}
            tone="blue"
            titleClassName={textPrimary}
            leading={
              <EntityCardHeaderIcon
                IconComponent={HeaderIcon}
                isActive={true}
                size={size}
                tone="blue"
              />
            }
          />
        </button>

        {isSmall ? (
          // SMALL: Compact view - Just temp and condition
          <div className="flex-1 flex flex-col justify-center">
            <div className={`text-3xl font-bold ${textPrimary} mb-1`}>{temperature}°C</div>
            <div className={`text-xs ${textSecondary}`}>{condition}</div>
            <div className={`text-xs ${textSecondary} mt-0.5`}>
              H:{highTemp}° L:{lowTemp}°
            </div>
          </div>
        ) : (
          <div className="mt-auto">
            {/* Main Section: Temperature + Details */}
            <div className="flex items-end justify-between mb-3">
              {/* Temperature with rain forecast below */}
              <div className="flex-shrink-0">
                <div className={`text-3xl font-bold ${textPrimary} leading-none mb-1`}>
                  {temperature}°C
                </div>
                <div className={`text-xs ${textSecondary} mb-0.5`}>
                  H:{highTemp}° L:{lowTemp}°
                </div>
                {rainForecast && <div className={`text-xs ${textSecondary}`}>{rainForecast}</div>}
              </div>

              {/* Weather Details - Right Aligned */}
              <div className="space-y-0.5 flex-shrink-0">
                <CaptionValue
                  caption={t('weather.precipitation')}
                  value={precipitationValue}
                  align="right"
                />
                <CaptionValue
                  caption={t('weather.humidity')}
                  value={`${humidity}%`}
                  align="right"
                />
                <CaptionValue
                  caption={t('weather.wind')}
                  value={`${windSpeed} km/h`}
                  align="right"
                />
              </div>
            </div>

            {/* Sun Times */}
            <div className="flex items-center justify-between my-8 px-1">
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-orange-400" />
                <span className={`text-xs ${textPrimary} font-medium`}>{sunrise}</span>
              </div>
              <div className="flex-1 mx-4 flex items-center">
                <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
              </div>
              <div className={`text-xs ${textSecondary} mx-2`}>{daylight}</div>
              <div className="flex-1 mx-4 flex items-center">
                <div className={`flex-1 border-t border-dashed ${dashedBorder}`} />
              </div>
              <div className="flex items-center gap-2">
                <Sunset className="w-4 h-4 text-orange-400" />
                <span className={`text-xs ${textPrimary} font-medium`}>{sunset}</span>
              </div>
            </div>

            {visibleForecast.length > 0 && (
              <div className="flex justify-between gap-3">
                {visibleForecast.map((day, index) => (
                  <div key={index} className="flex-1 text-center min-w-0">
                    <div className={`text-xs ${textSecondary} mb-2`}>{day.day}</div>
                    <WeatherIcon condition={day.condition} className="w-8 h-8 mx-auto mb-2" />
                    <div className={`text-xs font-medium ${textPrimary} mb-1`}>{day.high}°</div>
                    <div
                      className={`text-xs ${theme === 'light' ? 'text-gray-300' : surface.textMuted}`}
                    >
                      {day.low}°
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isSettingsOpen ? (
        <WeatherSettingsDialog
          entityId={id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          theme={theme}
          title={location}
          location={t('weather.subtitle')}
        />
      ) : null}
    </CardWrapper>
  );
});
