import { Gauge, TrendingDown, TrendingUp } from 'lucide-react';
import { memo } from 'react';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { formatSensorValue } from '@/app/hooks/ha-entity-utils';
import { homeAssistantSelectors } from '@/app/stores/selectors';

interface SensorCardProps {
  id: string;
  name: string;
  room: string;
  value: string;
  unit: string;
  icon?: 'gauge' | 'trend-up' | 'trend-down';
  subtitle?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export const SensorCard = memo(function SensorCard({
  id,
  name,
  room,
  value,
  unit,
  icon = 'gauge',
  subtitle,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: SensorCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const liveFormatted = liveEntity ? formatSensorValue(liveEntity) : null;
  const liveValue = liveFormatted?.value ?? value;
  const liveUnit = liveFormatted?.unit ?? unit;
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const shell = getAccentCardShellTokens(theme, 'teal');

  // Size-specific styling
  const isSmall = isCompactCardSize(size);
  const padding = isSmall ? 'p-4' : 'p-5';

  const IconComponent =
    icon === 'trend-up' ? TrendingUp : icon === 'trend-down' ? TrendingDown : Gauge;

  // Theme-aware colors
  const textPrimary = surface.textPrimary;
  const textSecondary = surface.textSubtle;
  const accentColor =
    theme === 'light' ? 'text-teal-700' : isGlass ? 'text-teal-200' : 'text-teal-400';
  return (
    <div
      className={`relative h-full ${cardShell.backdropClassName} rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} overflow-hidden ${shell.containerClassName}`}
    >
      <div className={`absolute inset-0 ${shell.glowClassName}`}></div>

      {shell.overlayClassName && <div className={`absolute inset-0 ${shell.overlayClassName}`} />}

      <div className="relative h-full flex flex-col">
        <EntityCardHeader
          title={name}
          subtitle={subtitle || t('sensors.single')}
          layout="eyebrow-first"
          size={size}
          tone="teal"
          leading={
            <EntityCardHeaderIcon
              IconComponent={IconComponent}
              isActive={true}
              size={size}
              tone="teal"
            />
          }
        />

        {!isSmall && <p className={`mb-2 text-xs ${textSecondary}`}>{room}</p>}

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`${isSmall ? 'text-3xl' : 'text-4xl'} font-bold ${textPrimary}`}>
              {liveValue}
              <span className={`${isSmall ? 'text-lg' : 'text-2xl'} ${accentColor} ml-1`}>
                {liveUnit}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
