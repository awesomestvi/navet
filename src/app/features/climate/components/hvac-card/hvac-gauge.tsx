import { memo } from 'react';
import { RotaryKnob } from '@/app/components/primitives';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
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
  minTemp?: number;
  maxTemp?: number;
  step?: number;
  helperText?: string;
  onTargetTempChange?: (temp: number) => void;
  onTargetTempCommit?: (temp: number) => void;
  variant?: 'card' | 'immersive' | 'docked-card' | 'docked-card-small';
  className?: string;
}

function formatDisplayTemperature(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function withAlpha(color: string, alphaHex: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${alphaHex}`;
  }

  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return `${color.slice(0, 7)}${alphaHex}`;
  }

  return color;
}

function getTemperatureBandColors(progress: number) {
  // Avoid the lime band entirely: keep neutral temps in cyan/aqua and only
  // shift into amber near the hot end.
  const coolHue = 192;
  const warmHue = 34;
  const warmStart = 0.72;
  const warmProgress = progress <= warmStart ? 0 : (progress - warmStart) / (1 - warmStart);
  const bandHue = coolHue - (coolHue - warmHue) * warmProgress;
  const primarySaturation = progress <= warmStart ? 82 : 82 - warmProgress * 8;
  const secondaryHue = progress <= warmStart ? 186 : Math.max(bandHue - 10, 28);

  return {
    primary: `hsl(${bandHue}, ${primarySaturation}%, 62%)`,
    secondary: `hsl(${secondaryHue}, 78%, 72%)`,
    glow: `hsla(${bandHue}, 84%, 62%, 0.34)`,
  };
}

export const HVACGauge = memo(function HVACGauge({
  id,
  mode,
  targetTemp,
  currentTemp,
  isOn,
  minTemp = 16,
  maxTemp = 30,
  step = 0.5,
  helperText,
  onTargetTempChange,
  onTargetTempCommit,
  variant = 'card',
  className,
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
  const gaugeLabel = t('climate.gaugeLabel', { mode, temp: targetTemp });
  const progress = clamp((targetTemp - minTemp) / Math.max(maxTemp - minTemp, step || 0.5), 0, 1);

  if (variant === 'immersive' || variant === 'docked-card' || variant === 'docked-card-small') {
    const stepSize = step || 0.5;
    const bandColors = getTemperatureBandColors(progress);
    const targetTemperatureColor = textTokens.titleColor;

    const updateTemperature = (nextValue: number) => {
      const steppedTemperature = Math.round((nextValue - minTemp) / stepSize) * stepSize + minTemp;
      return Number(clamp(steppedTemperature, minTemp, maxTemp).toFixed(1));
    };

    const handleTemperatureChange = (nextValue: number) => {
      if (!onTargetTempChange) {
        return;
      }

      onTargetTempChange(updateTemperature(nextValue));
    };

    const handleTemperatureCommit = (nextValue: number) => {
      if (!onTargetTempCommit) {
        return;
      }

      onTargetTempCommit(updateTemperature(nextValue));
    };

    if (variant === 'docked-card' || variant === 'docked-card-small') {
      const isCompact = variant === 'docked-card-small';
      const primaryBandColor = textTokens.titleColor;
      const secondaryBandColor = textTokens.subtitleColor;
      const glowBandColor = withAlpha(primaryBandColor, theme === 'light' ? '44' : '66');

      return (
        <div
          className={cn(
            'relative overflow-visible',
            isCompact ? 'h-[7.25rem] w-[2.5rem]' : 'h-[14.75rem] w-[4.75rem]',
            className
          )}
        >
          <RotaryKnob
            id={id}
            value={targetTemp}
            min={minTemp}
            max={maxTemp}
            step={stepSize}
            isOn={isOn}
            glowClassName={bgGlowColor}
            bandStrokeWidth={isCompact ? 30 : 28}
            tickOffsetRem={isCompact ? 7.9 : undefined}
            bandPrimaryColor={primaryBandColor}
            bandSecondaryColor={secondaryBandColor}
            bandGlowColor={glowBandColor}
            onValueChange={handleTemperatureChange}
            onValueCommit={handleTemperatureCommit}
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              isCompact
                ? 'right-[-5.6rem] h-[11.5rem] w-[11.5rem]'
                : 'right-[-11rem] h-[23rem] w-[23rem]'
            )}
          />
        </div>
      );
    }

    return (
      <div className={cn('relative h-[10.5rem] w-full overflow-visible', className)}>
        <div className="absolute bottom-0 left-0 z-[2] inline-flex max-w-[43%] flex-col px-8 pb-12">
          <div
            className="text-3xl font-bold leading-none"
            style={{
              color: targetTemperatureColor,
              textShadow:
                isOn && theme !== 'light'
                  ? `0 0 14px ${withAlpha(targetTemperatureColor, '55')}`
                  : 'none',
            }}
          >
            {formatDisplayTemperature(currentTemp)}°
          </div>

          <div className="mt-0.5 text-xs" style={{ color: textTokens.subtitleColor }}>
            {helperText ?? t('climate.currentTemperature', { temp: currentTemp })}
          </div>
        </div>

        <RotaryKnob
          id={id}
          value={targetTemp}
          min={minTemp}
          max={maxTemp}
          step={stepSize}
          isOn={isOn}
          glowClassName={bgGlowColor}
          tickOffsetRem={10.6}
          bandPrimaryColor={bandColors.primary}
          bandSecondaryColor={bandColors.secondary}
          bandGlowColor={bandColors.glow}
          onValueChange={handleTemperatureChange}
          onValueCommit={handleTemperatureCommit}
          className="absolute right-[-9.25rem] top-[54%] h-[17rem] w-[17rem] -translate-y-1/2"
        />
      </div>
    );
  }

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

  return (
    <div className={cn('relative h-36 w-56', className)}>
      <svg className="h-full w-full" viewBox="0 0 220 140" role="img" aria-label={gaugeLabel}>
        <title>{gaugeLabel}</title>
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
        </defs>

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
        <path
          d="M 30 110 A 80 80 0 0 1 190 110"
          fill="none"
          stroke={`url(#gauge-gradient-${id})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${progress * 251} 251`}
          className="transition-all duration-500"
          filter={isOn ? `url(#glow-${id})` : 'none'}
          style={{ filter: isOn ? `drop-shadow(0 0 12px ${glowColor})` : 'none' }}
        />

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

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
        <div className="relative">
          {isOn ? (
            <div
              className={`absolute inset-0 blur-xl opacity-50 ${bgGlowColor}`}
              style={{ transform: 'scale(1.5)' }}
            />
          ) : null}
          <div
            className={`relative text-5xl font-bold ${tempTextColor} leading-none transition-colors duration-500`}
            style={{
              color: textTokens.titleColor,
              textShadow: isOn && theme !== 'light' ? `0 0 20px ${textShadow}` : 'none',
            }}
          >
            {formatDisplayTemperature(targetTemp)}°
          </div>
        </div>
        <div
          className={`mt-2 text-xs ${currentTempColor}`}
          style={{ color: textTokens.subtitleColor }}
        >
          {t('climate.currentTemperature', { temp: currentTemp })}
        </div>
      </div>
    </div>
  );
});
