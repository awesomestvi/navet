import { memo } from 'react';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import {
  getHVACBackgroundGlowColor,
  getHVACGaugeColor,
  getHVACGlowColor,
  getHVACTextShadow,
} from '../../utils/hvac-styles';

interface HVACGaugeProps {
  id: string;
  mode: string;
  targetTemp: number;
  currentTemp: number;
  isOn: boolean;
}

export const HVACGauge = memo(function HVACGauge({
  id,
  mode,
  targetTemp,
  currentTemp,
  isOn,
}: HVACGaugeProps) {
  const { t } = useI18n();
  const gaugeColors = getHVACGaugeColor(mode);
  const glowColor = getHVACGlowColor(mode);
  const textShadow = getHVACTextShadow(mode);
  const bgGlowColor = getHVACBackgroundGlowColor(mode);
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const tone = !isOn ? 'neutral' : mode === 'heat' ? 'orange' : mode === 'cool' ? 'cyan' : 'blue';
  const textTokens = getCardReadableTextTokens({ theme, tone, accentColor });
  const tempTextColor =
    theme === 'light'
      ? isOn
        ? 'text-gray-900'
        : 'text-gray-300'
      : isOn
        ? 'text-white'
        : 'text-gray-500';
  const currentTempColor = surface.textSubtle;
  const tickColor = theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
  const arcBgStroke = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';
  const arcInnerStroke = theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.3)';
  const gaugeLabel = t('climate.gaugeLabel', { mode, temp: targetTemp });

  return (
    <div className="relative w-56 h-36">
      {/* SVG Half Circular Gauge */}
      <svg className="w-full h-full" viewBox="0 0 220 140" role="img" aria-label={gaugeLabel}>
        <title>{gaugeLabel}</title>
        {/* Outer glow effect */}
        <defs>
          <linearGradient id={`gauge-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gaugeColors.primary} stopOpacity={isOn ? '0.8' : '0.3'} />
            <stop
              offset="100%"
              stopColor={gaugeColors.secondary}
              stopOpacity={isOn ? '1' : '0.5'}
            />
          </linearGradient>
          <filter id={`glow-${id}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`shadow-${id}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background arc - subtle inner shadow effect */}
        <path
          d="M 30 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke={arcBgStroke}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 30 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke={arcInnerStroke}
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Progress arc with gradient and glow */}
        <path
          d="M 30 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke={`url(#gauge-gradient-${id})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${((targetTemp - 16) / 14) * 251} 251`}
          className="transition-all duration-500"
          filter={isOn ? `url(#glow-${id})` : 'none'}
          style={{
            filter: isOn ? `drop-shadow(0 0 12px ${glowColor})` : 'none',
          }}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const angle = -180 + (180 * percent) / 100;
          const rad = (angle * Math.PI) / 180;
          const x1 = 110 + 70 * Math.cos(rad);
          const y1 = 110 + 70 * Math.sin(rad);
          const x2 = 110 + 76 * Math.cos(rad);
          const y2 = 110 + 76 * Math.sin(rad);

          return (
            <line
              key={percent}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={tickColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Center content with subtle backdrop */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
        <div className="relative">
          {/* Glow behind text when on */}
          {isOn && (
            <div
              className={`absolute inset-0 blur-xl opacity-50 ${bgGlowColor}`}
              style={{ transform: 'scale(1.5)' }}
            />
          )}
          <div
            className={`relative text-5xl font-bold ${tempTextColor} leading-none transition-colors duration-500`}
            style={{
              color: textTokens.titleColor,
              textShadow: isOn && theme !== 'light' ? `0 0 20px ${textShadow}` : 'none',
            }}
          >
            {targetTemp}°
          </div>
        </div>
        <div
          className={`text-xs ${currentTempColor} mt-2`}
          style={{ color: textTokens.subtitleColor }}
        >
          {t('climate.currentTemperature', { temp: currentTemp })}
        </div>
      </div>
    </div>
  );
});
