import { memo } from 'react';
import { RotaryKnob, RoundControlButton } from '@/app/components/primitives';
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
  onTargetTempChange?: (temp: number) => void;
  variant?: 'card' | 'immersive';
  className?: string;
}

function formatDisplayTemperature(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTemperatureBandColors(progress: number) {
  const bandHue = 205 - progress * 175;

  return {
    primary: `hsl(${bandHue}, 92%, 60%)`,
    secondary: `hsl(${Math.max(bandHue - 18, 8)}, 94%, 70%)`,
    glow: `hsla(${bandHue}, 92%, 60%, 0.45)`,
  };
}

function TemperatureStepGlyph({ children }: { children: string }) {
  return (
    <span className="relative top-[-2px] flex items-center justify-center text-2xl leading-none">
      {children}
    </span>
  );
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
  onTargetTempChange,
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

  if (variant === 'immersive') {
    const stepSize = step || 0.5;
    const bandColors = getTemperatureBandColors(progress);
    const targetTemperatureColor = isOn ? bandColors.primary : textTokens.titleColor;

    const updateTemperature = (nextValue: number) => {
      if (!onTargetTempChange) {
        return;
      }

      const steppedTemperature = Math.round((nextValue - minTemp) / stepSize) * stepSize + minTemp;

      onTargetTempChange(Number(clamp(steppedTemperature, minTemp, maxTemp).toFixed(1)));
    };

    const handleStepAdjust = (direction: -1 | 1) => {
      updateTemperature(targetTemp + direction * stepSize);
    };

    return (
      <div className={cn('relative h-[22rem] w-full overflow-visible', className)}>
        <div className="relative z-[2] flex h-full max-w-[54%] flex-col justify-center px-6 pb-2">
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
          >
            {t('climate.target')}
          </div>

          <div
            className="mt-2 text-[5.5rem] font-semibold leading-none tracking-[-0.06em]"
            style={{
              color: targetTemperatureColor,
              textShadow: isOn && theme !== 'light' ? `0 0 22px ${bandColors.glow}` : 'none',
            }}
          >
            {formatDisplayTemperature(targetTemp)}°
          </div>

          <div className="mt-3 text-sm font-medium" style={{ color: textTokens.subtitleColor }}>
            {t('climate.currentTemperature', { temp: currentTemp })}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <RoundControlButton
              theme={theme}
              size="large"
              variant="soft"
              aria-label={t('climate.decreaseTemperature')}
              onClick={() => handleStepAdjust(-1)}
              disabled={!isOn || targetTemp <= minTemp}
              className="h-12 w-12 bg-white/10 text-white hover:bg-white/16"
            >
              <TemperatureStepGlyph>-</TemperatureStepGlyph>
            </RoundControlButton>

            <RoundControlButton
              theme={theme}
              size="large"
              variant="soft"
              aria-label={t('climate.increaseTemperature')}
              onClick={() => handleStepAdjust(1)}
              disabled={!isOn || targetTemp >= maxTemp}
              className="h-12 w-12 bg-white/10 text-white hover:bg-white/16"
            >
              <TemperatureStepGlyph>+</TemperatureStepGlyph>
            </RoundControlButton>
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
          bandPrimaryColor={bandColors.primary}
          bandSecondaryColor={bandColors.secondary}
          bandGlowColor={bandColors.glow}
          onValueChange={updateTemperature}
          className="absolute right-[-11.25rem] top-1/2 -translate-y-1/2"
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
