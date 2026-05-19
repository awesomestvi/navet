import { memo } from 'react';
import { Slider } from '@/app/components/primitives/slider';
import {
  isCompactCardSize,
  isExtraSmallCardSize,
} from '@/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { CardSize } from '../card-size-selector';
import { getDeviceEditorSurfaceTokens } from './device-editor-surface-tokens';

interface BrightnessSliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  isOn?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  size?: CardSize;
  activeColor?: string | null;
}

export const BrightnessSlider = memo(function BrightnessSlider({
  value,
  onChange,
  onCommit,
  isOn = true,
  disabled = false,
  showLabel = true,
  size = 'medium',
  activeColor: activeColorOverride,
}: BrightnessSliderProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const isExtraSmall = isExtraSmallCardSize(size);
  const isCompact = isCompactCardSize(size);
  const editorSurface = getDeviceEditorSurfaceTokens(isOn);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: isOn ? 'primary' : 'neutral',
    accentColor,
    baseColor: isOn ? (activeColorOverride ?? accentColor) : undefined,
  });
  const heightClass = isExtraSmall ? 'h-4' : isCompact ? 'h-5' : 'h-6';
  const trackHeightClass = 'h-[3px]';
  const thumbSizeClass = 'w-4 h-4';
  const trackBg = theme === 'light' ? 'bg-gray-200' : 'bg-white/10';
  const activeColor = activeColorOverride ?? accentColor;
  const rangeBg = isOn
    ? theme === 'glass'
      ? `linear-gradient(to right, rgba(255,255,255,0.42), ${activeColor}cc)`
      : theme === 'light'
        ? `linear-gradient(to right, ${activeColor}99, ${activeColor})`
        : `linear-gradient(to right, ${activeColor}cc, ${activeColor})`
    : theme === 'light'
      ? 'linear-gradient(to right, #d1d5db, #9ca3af)'
      : 'linear-gradient(to right, rgba(255,255,255,0.24), rgba(255,255,255,0.14))';
  const thumbBg = isOn
    ? theme === 'glass'
      ? `${activeColor}f2`
      : activeColor
    : theme === 'light'
      ? '#f3f4f6'
      : '#d1d5db';
  const thumbRing = isOn
    ? theme === 'glass'
      ? `${activeColor}66`
      : `${activeColor}66`
    : theme === 'light'
      ? '#9ca3af'
      : 'rgba(255,255,255,0.24)';

  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-xs ${editorSurface.sectionLabelClassName}`}
            style={{ color: textTokens.subtitleColor }}
          >
            {t('lighting.brightness')}
          </span>
          <span
            className={`text-sm font-bold ${editorSurface.sectionValueClassName}`}
            style={{ color: textTokens.titleColor }}
          >
            {value}%
          </span>
        </div>
      )}
      <Slider
        value={value}
        onValueChange={onChange}
        onValueCommit={onCommit}
        min={1}
        max={100}
        step={1}
        disabled={disabled}
        dataCardInteractive
        ariaLabel={t('lighting.brightness')}
        rootClassName={`relative flex items-center w-full select-none touch-none ${heightClass}`}
        trackClassName={`relative grow rounded-full ${trackHeightClass} ${trackBg}`}
        rangeClassName="absolute h-full rounded-full"
        thumbClassName={`block ${thumbSizeClass} rounded-full shadow-lg focus:outline-none cursor-pointer touch-none`}
        touchThumbClassName="block h-6 w-6 rounded-full shadow-lg focus:outline-none cursor-pointer touch-none"
        rangeStyle={{
          backgroundImage: rangeBg,
        }}
        thumbStyle={{ backgroundColor: thumbBg, boxShadow: `0 0 0 2px ${thumbRing}` }}
      />
    </div>
  );
});
