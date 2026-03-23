import { TrendingDown, Zap } from 'lucide-react';
import { memo } from 'react';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';

interface PowerCardProps {
  percentage: number;
  usage: string;
  cost: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export const PowerCard = memo(function PowerCard({
  percentage,
  usage,
  cost,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: PowerCardProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const isGlass = theme === 'glass';
  const shell = getAccentCardShellTokens(theme, 'yellow');

  // Size-specific styling with intelligent layout adaptation
  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const padding = isSmall ? 'p-4' : 'p-5';

  // Samsung-style energy comparison data
  const lastMonthCost = '3.10';
  const savedAmount = (parseFloat(lastMonthCost) - parseFloat(cost)).toFixed(2);
  const lastMonthUsage = '3.1 kW';
  const usageFloat = parseFloat(usage);
  const lastMonthUsageFloat = parseFloat(lastMonthUsage);
  const usageDiff = (lastMonthUsageFloat - usageFloat).toFixed(1);

  // Theme-aware colors
  const textPrimary = surface.textPrimary;
  const textSecondary = surface.textSubtle;
  const iconBg =
    theme === 'light'
      ? 'bg-cyan-100'
      : isGlass
        ? 'bg-cyan-300/24 border border-cyan-100/20'
        : 'bg-cyan-500/24 border border-cyan-300/18';
  const iconColor =
    theme === 'light' ? 'text-cyan-700' : isGlass ? 'text-cyan-100' : 'text-cyan-300';
  const accentColor =
    theme === 'light' ? 'text-cyan-700' : isGlass ? 'text-cyan-200' : 'text-cyan-400';
  const progressBg = theme === 'light' ? 'bg-gray-200' : isGlass ? 'bg-white/12' : 'bg-white/10';
  const savingBg =
    theme === 'light' ? 'bg-green-100' : isGlass ? 'bg-green-300/16' : 'bg-green-500/20';
  const savingText =
    theme === 'light' ? 'text-green-700' : isGlass ? 'text-green-200' : 'text-green-400';
  const infoBg = theme === 'light' ? 'bg-gray-100' : isGlass ? 'bg-white/8' : 'bg-white/5';

  return (
    <div
      className={`relative h-full ${cardShell.backdropClassName} rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} overflow-hidden ${shell.containerClassName}`}
    >
      <div className={`absolute inset-0 ${shell.glowClassName}`}></div>

      {shell.overlayClassName && <div className={`absolute inset-0 ${shell.overlayClassName}`} />}

      <div className="relative h-full flex flex-col">
        <EntityCardHeader
          title={t('power.title')}
          subtitle={t('power.subtitle')}
          size={size}
          titleClassName={textPrimary}
          subtitleClassName={surface.textMuted}
          className={isSmall ? 'mb-1 justify-between' : 'mb-2 justify-between'}
          trailing={
            <div
              className={`${isSmall ? 'w-8 h-8' : 'w-10 h-10'} rounded-full ${iconBg} flex items-center justify-center`}
            >
              <Zap className={`${isSmall ? 'w-4 h-4' : 'w-5 h-5'} ${iconColor}`} />
            </div>
          }
        />

        {isSmall ? (
          // Small: Just percentage
          <div className="flex-1 flex items-center justify-center">
            <div className={`text-3xl font-bold ${textPrimary} leading-none`}>{percentage}%</div>
          </div>
        ) : isMedium ? (
          // Medium: Compact layout with savings badge
          <>
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="flex items-baseline gap-2">
                <div className={`text-3xl font-bold ${textPrimary} leading-none`}>${cost}</div>
                <div className={`flex items-center gap-1 px-2 py-0.5 ${savingBg} rounded-full`}>
                  <TrendingDown className={`w-3 h-3 ${savingText}`} />
                  <span className={`text-[10px] ${savingText} font-medium`}>
                    {t('power.savingAmount', { amount: savedAmount })}
                  </span>
                </div>
              </div>
              <div className={`w-full h-2 ${progressBg} rounded-full overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <div className={`flex justify-between text-[10px] mt-2 ${textSecondary}`}>
              <span>{usage}</span>
              <span className={`${accentColor} font-semibold`}>{percentage}%</span>
            </div>
          </>
        ) : (
          // Large: Full display with detailed info
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <div className="flex items-baseline gap-2 mb-1">
                <div className={`text-3xl font-bold ${textPrimary}`}>${cost}</div>
                <div className={`flex items-center gap-1 px-2 py-1 ${savingBg} rounded-full`}>
                  <TrendingDown className={`w-3 h-3 ${savingText}`} />
                  <span className={`text-xs ${savingText} font-medium`}>
                    {t('power.savingAmount', { amount: savedAmount })}
                  </span>
                </div>
              </div>
              <div className={`text-xs ${textSecondary}`}>
                {t('power.usingLess', { amount: usageDiff })}
              </div>
            </div>

            <div className={`w-full h-2 ${progressBg} rounded-full overflow-hidden mb-3`}>
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className={`grid grid-cols-2 gap-2 p-2 ${infoBg} rounded-lg`}>
              <div>
                <div className={`text-[10px] ${textSecondary}`}>{t('power.currentUsage')}</div>
                <div className={`text-xs font-semibold ${textPrimary}`}>{usage}</div>
              </div>
              <div>
                <div className={`text-[10px] ${textSecondary}`}>{t('power.lastMonth')}</div>
                <div className={`text-xs font-semibold ${textSecondary}`}>${lastMonthCost}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
